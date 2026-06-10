"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
const client_1 = require("@prisma/client");
class ApprovalService {
    /**
     * Get list of Pengajuan scoped to Paroki, with RBAC scoping
     */
    static async getApprovals(parokiId, actorId, role, filters) {
        const whereClause = {
            pemohon: {
                parokiId,
            },
        };
        // RBAC: KETUA_KOMISI can only see their own proposals
        if (role === client_1.Role.KETUA_KOMISI) {
            whereClause.pemohonId = actorId;
        }
        if (filters.status) {
            whereClause.status = filters.status;
        }
        if (filters.search) {
            whereClause.judul = {
                contains: filters.search,
                mode: 'insensitive',
            };
        }
        return await database_1.prisma.pengajuan.findMany({
            where: whereClause,
            include: {
                pemohon: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
                anggaran: {
                    include: {
                        komisi: true,
                    },
                },
                alur: {
                    include: {
                        pic: {
                            select: {
                                id: true,
                                name: true,
                                email: true,
                                role: true,
                            },
                        },
                    },
                    orderBy: {
                        tanggal: 'asc',
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    /**
     * Create a new Pengajuan
     */
    static async createPengajuan(parokiId, actorId, input) {
        // 1. Fetch Anggaran and check bounds
        const anggaran = await database_1.prisma.anggaran.findUnique({
            where: { id: input.anggaranId },
            include: { komisi: true },
        });
        if (!anggaran) {
            throw api_error_1.ApiError.notFound('Anggaran tidak ditemukan');
        }
        if (anggaran.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Anggaran berada di luar paroki Anda');
        }
        // 2. Validate nominal <= sisa budget
        if (input.nominal > Number(anggaran.sisa)) {
            throw api_error_1.ApiError.badRequest('Nominal pengajuan melebihi sisa anggaran yang tersedia');
        }
        // 3. Execute creation in transaction to ensure audit history consistency
        return await database_1.prisma.$transaction(async (tx) => {
            // Re-verify budget inside transaction lock (optional but recommended for concurrency)
            const freshAnggaran = await tx.anggaran.findUnique({
                where: { id: input.anggaranId },
            });
            if (!freshAnggaran) {
                throw api_error_1.ApiError.notFound('Anggaran tidak ditemukan');
            }
            if (input.nominal > Number(freshAnggaran.sisa)) {
                throw api_error_1.ApiError.badRequest('Nominal pengajuan melebihi sisa anggaran yang tersedia');
            }
            // Create Proposal
            const newPengajuan = await tx.pengajuan.create({
                data: {
                    judul: input.judul,
                    nominal: input.nominal,
                    tujuan: input.tujuan,
                    status: client_1.ApprovalStatus.MENUNGGU_VERIFIKASI,
                    komisiId: anggaran.komisiId,
                    anggaranId: input.anggaranId,
                    pemohonId: actorId,
                },
                include: {
                    pemohon: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                    anggaran: {
                        include: {
                            komisi: true,
                        },
                    },
                    alur: true,
                },
            });
            // Log initial submission to Approval History
            await tx.approvalHistory.create({
                data: {
                    step: 'Pengajuan Baru',
                    action: 'SUBMIT',
                    catatan: 'Pengajuan diajukan oleh Ketua Komisi',
                    picId: actorId,
                    pengajuanId: newPengajuan.id,
                },
            });
            // Log to Audit Trail
            const formattedNominal = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(input.nominal);
            await tx.auditLog.create({
                data: {
                    type: 'APPROVE',
                    action: `Ketua Komisi membuat pengajuan "${input.judul}" senilai ${formattedNominal}`,
                    amount: input.nominal,
                    actorId,
                    parokiId,
                },
            });
            return newPengajuan;
        });
    }
    /**
     * Update Proposal Status / Process State Machine Transitions
     */
    static async updateApprovalStatus(parokiId, actorId, role, id, input) {
        // 1. Fetch current Pengajuan and verify Paroki scope
        const pengajuan = await database_1.prisma.pengajuan.findUnique({
            where: { id },
            include: {
                pemohon: true,
                anggaran: true,
            },
        });
        if (!pengajuan) {
            throw api_error_1.ApiError.notFound('Pengajuan tidak ditemukan');
        }
        if (pengajuan.pemohon.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Anda tidak memiliki akses ke pengajuan ini');
        }
        let newStatus;
        let approvalStep;
        // 2. State machine guards based on actor role
        if (role === client_1.Role.BENDAHARA) {
            if (pengajuan.status !== client_1.ApprovalStatus.MENUNGGU_VERIFIKASI) {
                throw api_error_1.ApiError.badRequest(`Pengajuan tidak dapat diproses oleh Bendahara karena berstatus ${pengajuan.status}`);
            }
            if (input.action === 'APPROVE') {
                // Threshold: <= Rp 500k auto approve, > Rp 500k escalate to Pastor
                const nominal = Number(pengajuan.nominal);
                if (nominal <= 500000) {
                    newStatus = client_1.ApprovalStatus.DISETUJUI;
                }
                else {
                    newStatus = client_1.ApprovalStatus.MENUNGGU_PERSETUJUAN;
                }
            }
            else if (input.action === 'REJECT') {
                newStatus = client_1.ApprovalStatus.DITOLAK;
            }
            else if (input.action === 'REVISE') {
                newStatus = client_1.ApprovalStatus.REVISI;
            }
            else {
                throw api_error_1.ApiError.badRequest(`Aksi ${input.action} tidak didukung untuk Bendahara`);
            }
            approvalStep = 'Verifikasi Bendahara';
        }
        else if (role === client_1.Role.PASTOR) {
            if (pengajuan.status !== client_1.ApprovalStatus.MENUNGGU_PERSETUJUAN) {
                throw api_error_1.ApiError.badRequest(`Pengajuan tidak dapat diproses oleh Pastor karena berstatus ${pengajuan.status}`);
            }
            if (input.action === 'APPROVE') {
                newStatus = client_1.ApprovalStatus.DISETUJUI;
            }
            else if (input.action === 'REJECT') {
                newStatus = client_1.ApprovalStatus.DITOLAK;
            }
            else if (input.action === 'REVISE') {
                newStatus = client_1.ApprovalStatus.REVISI;
            }
            else {
                throw api_error_1.ApiError.badRequest(`Aksi ${input.action} tidak didukung untuk Pastor`);
            }
            approvalStep = 'Persetujuan Pastor';
        }
        else if (role === client_1.Role.KETUA_KOMISI) {
            if (pengajuan.status !== client_1.ApprovalStatus.REVISI) {
                throw api_error_1.ApiError.badRequest(`Resubmit hanya dapat dilakukan pada pengajuan yang berstatus REVISI`);
            }
            if (pengajuan.pemohonId !== actorId) {
                throw api_error_1.ApiError.forbidden('Hanya pemohon asli yang dapat melakukan resubmit');
            }
            if (input.action !== 'SUBMIT') {
                throw api_error_1.ApiError.badRequest(`Ketua Komisi hanya dapat melakukan aksi SUBMIT pada tahap resubmit`);
            }
            newStatus = client_1.ApprovalStatus.MENUNGGU_VERIFIKASI;
            approvalStep = 'Resubmit Ketua Komisi';
        }
        else {
            throw api_error_1.ApiError.forbidden('Anda tidak memiliki wewenang untuk memproses pengajuan ini');
        }
        // 3. Execute update in transaction to guarantee consistency
        return await database_1.prisma.$transaction(async (tx) => {
            // Re-verify remaining budget balance to prevent over-allocation if status changes back to flow
            if (newStatus === client_1.ApprovalStatus.DISETUJUI || newStatus === client_1.ApprovalStatus.MENUNGGU_VERIFIKASI) {
                const freshAnggaran = await tx.anggaran.findUnique({
                    where: { id: pengajuan.anggaranId },
                });
                if (!freshAnggaran) {
                    throw api_error_1.ApiError.notFound('Anggaran tidak ditemukan');
                }
                if (Number(pengajuan.nominal) > Number(freshAnggaran.sisa)) {
                    throw api_error_1.ApiError.badRequest('Nominal pengajuan melebihi sisa anggaran yang tersedia');
                }
            }
            // Update Pengajuan status
            const updated = await tx.pengajuan.update({
                where: { id },
                data: { status: newStatus },
                include: {
                    pemohon: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            role: true,
                        },
                    },
                    anggaran: {
                        include: {
                            komisi: true,
                        },
                    },
                    alur: {
                        include: {
                            pic: {
                                select: {
                                    id: true,
                                    name: true,
                                    email: true,
                                    role: true,
                                },
                            },
                        },
                        orderBy: {
                            tanggal: 'asc',
                        },
                    },
                },
            });
            // Write Approval History step
            await tx.approvalHistory.create({
                data: {
                    step: approvalStep,
                    action: input.action,
                    catatan: input.catatan || null,
                    picId: actorId,
                    pengajuanId: id,
                },
            });
            // Log Audit Trail
            const formattedNominal = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(Number(pengajuan.nominal));
            let auditAction = '';
            let auditType = '';
            if (input.action === 'APPROVE') {
                auditType = 'APPROVE';
                auditAction = `${role === client_1.Role.BENDAHARA ? 'Bendahara memverifikasi' : 'Pastor menyetujui'} pengajuan "${pengajuan.judul}" senilai ${formattedNominal}. Status: ${newStatus}`;
            }
            else if (input.action === 'REJECT') {
                auditType = 'REJECT';
                auditAction = `${role === client_1.Role.BENDAHARA ? 'Bendahara menolak' : 'Pastor menolak'} pengajuan "${pengajuan.judul}" senilai ${formattedNominal}`;
            }
            else if (input.action === 'REVISE') {
                auditType = 'REVISE';
                auditAction = `${role === client_1.Role.BENDAHARA ? 'Bendahara meminta revisi' : 'Pastor meminta revisi'} pengajuan "${pengajuan.judul}" senilai ${formattedNominal}`;
            }
            else if (input.action === 'SUBMIT') {
                auditType = 'APPROVE';
                auditAction = `Ketua Komisi melakukan resubmit pengajuan "${pengajuan.judul}" senilai ${formattedNominal}`;
            }
            await tx.auditLog.create({
                data: {
                    type: auditType || 'APPROVE',
                    action: auditAction,
                    amount: pengajuan.nominal,
                    actorId,
                    parokiId,
                },
            });
            return updated;
        });
    }
}
exports.ApprovalService = ApprovalService;
