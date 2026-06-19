"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermohonanAnggaranService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
const client_1 = require("@prisma/client");
class PermohonanAnggaranService {
    /**
     * Submit a new budget request linked to an activity
     */
    static async createPermohonanAnggaran(parokiId, pemohonId, input) {
        // 1. Verify activity exists and belongs to Paroki
        const kegiatan = await database_1.prisma.pengajuanKegiatan.findUnique({
            where: { id: input.kegiatanId },
            include: { komisi: true },
        });
        if (!kegiatan) {
            throw api_error_1.ApiError.notFound('Kegiatan tidak ditemukan');
        }
        if (kegiatan.komisi.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Kegiatan berada di luar paroki Anda');
        }
        // 2. Calculate totals from details
        const totalEstimasi = input.details.reduce((sum, item) => {
            const subtotal = item.qty * item.hargaSatuan;
            return sum + subtotal;
        }, 0);
        return await database_1.prisma.$transaction(async (tx) => {
            // 3. Generate proposal number: PA-YYYYMMDD-XXXX
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);
            const countToday = await tx.permohonanAnggaran.count({
                where: {
                    kegiatan: { komisi: { parokiId } },
                    createdAt: {
                        gte: todayStart,
                        lt: tomorrowStart,
                    },
                },
            });
            const yyyymmdd = todayStart.toISOString().slice(0, 10).replace(/-/g, '');
            const seq = String(countToday + 1).padStart(4, '0');
            const nomorPermohonan = `PA-${yyyymmdd}-${seq}`;
            // 4. Create budget request header
            const permohonan = await tx.permohonanAnggaran.create({
                data: {
                    nomorPermohonan,
                    kegiatanId: input.kegiatanId,
                    pemohonId,
                    tanggalPermohonan: new Date(),
                    estimasiBiaya: totalEstimasi,
                    jumlahDiajukan: totalEstimasi,
                    status: client_1.StatusPermohonanAnggaran.DIAJUKAN,
                },
            });
            // 5. Create RAB details
            await Promise.all(input.details.map(async (item) => {
                const subtotal = item.qty * item.hargaSatuan;
                await tx.permohonanAnggaranDetail.create({
                    data: {
                        permohonanId: permohonan.id,
                        uraian: item.uraian,
                        qty: item.qty,
                        satuan: item.satuan,
                        hargaSatuan: item.hargaSatuan,
                        subtotal,
                        keterangan: item.keterangan || null,
                    },
                });
            }));
            // 6. Log initial submission step
            await tx.approvalHistory.create({
                data: {
                    step: 'Pengajuan Anggaran',
                    action: 'SUBMIT',
                    catatan: 'Permohonan anggaran diajukan oleh Pemohon',
                    picId: pemohonId,
                    permohonanAnggaranId: permohonan.id,
                },
            });
            // 7. Log Audit Trail
            const formattedAmount = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(totalEstimasi);
            await tx.auditLog.create({
                data: {
                    type: 'APPROVE',
                    action: `Pemohon mengajukan permohonan anggaran ${nomorPermohonan} senilai ${formattedAmount} untuk kegiatan "${kegiatan.namaKegiatan}"`,
                    amount: totalEstimasi,
                    actorId: pemohonId,
                    parokiId,
                },
            });
            return permohonan;
        });
    }
    /**
     * Get list of budget requests
     */
    static async getPermohonanAnggaran(parokiId, actorId, role, filters) {
        const whereClause = {
            kegiatan: {
                komisi: {
                    parokiId,
                },
            },
        };
        if (role === client_1.Role.KETUA_KOMISI) {
            whereClause.pemohonId = actorId;
        }
        if (filters.status) {
            whereClause.status = filters.status;
        }
        if (filters.search) {
            whereClause.OR = [
                { nomorPermohonan: { contains: filters.search, mode: 'insensitive' } },
                { kegiatan: { namaKegiatan: { contains: filters.search, mode: 'insensitive' } } },
            ];
        }
        return await database_1.prisma.permohonanAnggaran.findMany({
            where: whereClause,
            include: {
                kegiatan: {
                    include: { komisi: true },
                },
                pemohon: {
                    select: { id: true, name: true, email: true, role: true },
                },
                details: true,
                posDana: true,
                approvals: {
                    include: { pic: { select: { id: true, name: true, email: true, role: true } } },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * Get single budget request details
     */
    static async getPermohonanAnggaranById(parokiId, id) {
        const permohonan = await database_1.prisma.permohonanAnggaran.findUnique({
            where: { id },
            include: {
                kegiatan: {
                    include: { komisi: true },
                },
                pemohon: {
                    select: { id: true, name: true, email: true, role: true },
                },
                details: true,
                posDana: true,
                approvals: {
                    include: { pic: { select: { id: true, name: true, email: true, role: true } } },
                    orderBy: { tanggal: 'asc' },
                },
            },
        });
        if (!permohonan) {
            throw api_error_1.ApiError.notFound('Permohonan Anggaran tidak ditemukan');
        }
        if (permohonan.kegiatan.komisi.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Permohonan Anggaran berada di luar paroki Anda');
        }
        return permohonan;
    }
    /**
     * Update budget request status
     */
    static async updatePermohonanAnggaranStatus(parokiId, actorId, role, id, input) {
        const permohonan = await database_1.prisma.permohonanAnggaran.findUnique({
            where: { id },
            include: { kegiatan: { include: { komisi: true } } },
        });
        if (!permohonan) {
            throw api_error_1.ApiError.notFound('Permohonan Anggaran tidak ditemukan');
        }
        if (permohonan.kegiatan.komisi.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Permohonan Anggaran berada di luar paroki Anda');
        }
        let newStatus;
        let stepName;
        let finalPosDanaId = permohonan.posDanaId;
        let finalJumlahDisetujui = Number(permohonan.jumlahDisetujui);
        if (role === client_1.Role.BENDAHARA) {
            if (permohonan.status !== client_1.StatusPermohonanAnggaran.DIAJUKAN) {
                throw api_error_1.ApiError.badRequest(`Permohonan tidak dapat diproses oleh Bendahara karena berstatus ${permohonan.status}`);
            }
            if (input.action === 'REVIEW_BENDAHARA') {
                if (!input.posDanaId) {
                    throw api_error_1.ApiError.badRequest('Pos Dana final wajib ditentukan oleh Bendahara saat review');
                }
                // Check Pos Dana belongs to Paroki
                const fund = await database_1.prisma.fundCategory.findUnique({
                    where: { id: input.posDanaId },
                });
                if (!fund || fund.parokiId !== parokiId) {
                    throw api_error_1.ApiError.badRequest('Pos Dana tidak ditemukan atau tidak valid');
                }
                finalPosDanaId = input.posDanaId;
                finalJumlahDisetujui = input.jumlahDisetujui !== undefined ? input.jumlahDisetujui : Number(permohonan.jumlahDiajukan);
                // Threshold auto-approval check: <= Rp 500.000 auto approve, > Rp 500.000 needs Pastor sign-off
                if (finalJumlahDisetujui <= 500000) {
                    newStatus = client_1.StatusPermohonanAnggaran.DISETUJUI;
                }
                else {
                    newStatus = client_1.StatusPermohonanAnggaran.MENUNGGU_PERSETUJUAN;
                }
            }
            else if (input.action === 'REJECT') {
                newStatus = client_1.StatusPermohonanAnggaran.DITOLAK;
            }
            else if (input.action === 'REVISE') {
                newStatus = client_1.StatusPermohonanAnggaran.DRAFT; // Reset to draft for proposer edit
            }
            else {
                throw api_error_1.ApiError.badRequest(`Aksi ${input.action} tidak didukung untuk Bendahara`);
            }
            stepName = 'Review Anggaran Bendahara';
        }
        else if (role === client_1.Role.PASTOR) {
            if (permohonan.status !== client_1.StatusPermohonanAnggaran.MENUNGGU_PERSETUJUAN && permohonan.status !== client_1.StatusPermohonanAnggaran.DIAJUKAN) {
                throw api_error_1.ApiError.badRequest(`Permohonan tidak dapat diproses oleh Pastor karena berstatus ${permohonan.status}`);
            }
            if (input.action === 'APPROVE') {
                newStatus = client_1.StatusPermohonanAnggaran.DISETUJUI;
            }
            else if (input.action === 'REJECT') {
                newStatus = client_1.StatusPermohonanAnggaran.DITOLAK;
            }
            else if (input.action === 'REVISE') {
                newStatus = client_1.StatusPermohonanAnggaran.DRAFT; // Reset to draft for proposer edit
            }
            else {
                throw api_error_1.ApiError.badRequest(`Aksi ${input.action} tidak didukung untuk Pastor`);
            }
            stepName = 'Persetujuan Anggaran Pastor';
        }
        else {
            throw api_error_1.ApiError.forbidden('Anda tidak memiliki wewenang untuk meninjau permohonan anggaran ini');
        }
        return await database_1.prisma.$transaction(async (tx) => {
            const updated = await tx.permohonanAnggaran.update({
                where: { id },
                data: {
                    status: newStatus,
                    posDanaId: finalPosDanaId,
                    jumlahDisetujui: finalJumlahDisetujui,
                    catatanReview: input.catatan || null,
                    ...(role === client_1.Role.BENDAHARA && { reviewedById: actorId }),
                    ...(role === client_1.Role.PASTOR && input.action === 'APPROVE' && { approvedById: actorId }),
                },
                include: {
                    kegiatan: true,
                    pemohon: { select: { id: true, name: true, email: true, role: true } },
                    details: true,
                    posDana: true,
                },
            });
            await tx.approvalHistory.create({
                data: {
                    step: stepName,
                    action: input.action,
                    catatan: input.catatan || null,
                    picId: actorId,
                    permohonanAnggaranId: id,
                },
            });
            const formattedAmount = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(finalJumlahDisetujui);
            await tx.auditLog.create({
                data: {
                    type: 'APPROVE',
                    action: `Otoritas memperbarui status anggaran ${permohonan.nomorPermohonan} menjadi ${newStatus} senilai ${formattedAmount}`,
                    amount: finalJumlahDisetujui,
                    actorId,
                    parokiId,
                },
            });
            return updated;
        });
    }
}
exports.PermohonanAnggaranService = PermohonanAnggaranService;
