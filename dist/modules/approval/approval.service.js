"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApprovalService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
const client_1 = require("@prisma/client");
class ApprovalService {
    /**
     * Helper to calculate available budget dynamically:
     * Plafon - Realisasi (EXPENSE transactions) - Pending/Approved proposals
     */
    static async calculateAvailableBudget(tx, budgetItemId, excludeProposalId) {
        const item = await tx.budgetItem.findUnique({
            where: { id: budgetItemId },
        });
        if (!item)
            return 0;
        // Sum all transaction expenses
        const realAgg = await tx.cashTransaction.aggregate({
            where: {
                budgetItemId,
                transactionType: 'EXPENSE',
            },
            _sum: { amount: true },
        });
        const realisasi = Number(realAgg._sum.amount || 0);
        // Sum all pending/approved proposals
        const propAgg = await tx.pengajuan.aggregate({
            where: {
                budgetItemId,
                status: {
                    in: [
                        client_1.ApprovalStatus.MENUNGGU_VERIFIKASI,
                        client_1.ApprovalStatus.MENUNGGU_PERSETUJUAN,
                        client_1.ApprovalStatus.DISETUJUI,
                    ],
                },
                ...(excludeProposalId && { id: { not: excludeProposalId } }),
            },
            _sum: { nominal: true },
        });
        const pending = Number(propAgg._sum.nominal || 0);
        return Number(item.plafon) - realisasi - pending;
    }
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
                budgetItem: {
                    include: {
                        budget: {
                            include: {
                                fundCategory: true,
                            },
                        },
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
     * Create a new Pengajuan (Proposal)
     */
    static async createPengajuan(parokiId, actorId, input) {
        // 1. Fetch BudgetItem and check boundaries
        const budgetItem = await database_1.prisma.budgetItem.findUnique({
            where: { id: input.budgetItemId },
            include: { budget: true },
        });
        if (!budgetItem) {
            throw api_error_1.ApiError.notFound('Item Anggaran tidak ditemukan');
        }
        if (budgetItem.budget.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Item Anggaran berada di luar paroki Anda');
        }
        if (!budgetItem.komisiId) {
            throw api_error_1.ApiError.badRequest('Item anggaran ini bersifat umum paroki dan tidak dikelola oleh Komisi');
        }
        // 2. Execute creation in transaction to verify dynamic limits and log history
        return await database_1.prisma.$transaction(async (tx) => {
            const available = await this.calculateAvailableBudget(tx, input.budgetItemId);
            if (input.nominal > available) {
                throw api_error_1.ApiError.badRequest(`Nominal pengajuan melebihi sisa anggaran yang tersedia (Tersedia: Rp ${available.toLocaleString('id-ID')})`);
            }
            // Create Proposal
            const newPengajuan = await tx.pengajuan.create({
                data: {
                    judul: input.judul,
                    nominal: input.nominal,
                    tujuan: input.tujuan,
                    status: client_1.ApprovalStatus.MENUNGGU_VERIFIKASI,
                    komisiId: budgetItem.komisiId,
                    budgetItemId: input.budgetItemId,
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
                    budgetItem: {
                        include: {
                            budget: {
                                include: {
                                    fundCategory: true,
                                },
                            },
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
        // 1. Fetch current Pengajuan
        const pengajuan = await database_1.prisma.pengajuan.findUnique({
            where: { id },
            include: {
                pemohon: true,
                budgetItem: {
                    include: { budget: true },
                },
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
        // 3. Execute update in transaction to verify dynamic limits and log history
        return await database_1.prisma.$transaction(async (tx) => {
            // Re-verify budget item limit inside transaction lock to prevent over-allocation
            if (newStatus === client_1.ApprovalStatus.DISETUJUI || newStatus === client_1.ApprovalStatus.MENUNGGU_VERIFIKASI) {
                const available = await this.calculateAvailableBudget(tx, pengajuan.budgetItemId, id);
                if (Number(pengajuan.nominal) > available) {
                    throw api_error_1.ApiError.badRequest(`Nominal pengajuan melebihi sisa anggaran yang tersedia (Tersedia: Rp ${available.toLocaleString('id-ID')})`);
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
                    budgetItem: {
                        include: {
                            budget: {
                                include: {
                                    fundCategory: true,
                                },
                            },
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
