"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpjService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
const client_1 = require("@prisma/client");
class SpjService {
    /**
     * Get all SPJ documents scoped to Paroki with optional filters
     */
    static async getSpjs(parokiId, filters) {
        const whereClause = {
            OR: [
                { cashTransaction: { parokiId } },
                { kegiatan: { komisi: { parokiId } } },
            ],
        };
        if (filters.status) {
            whereClause.status = filters.status;
        }
        if (filters.search) {
            whereClause.title = { contains: filters.search, mode: 'insensitive' };
        }
        return await database_1.prisma.spj.findMany({
            where: whereClause,
            include: {
                cashTransaction: {
                    include: {
                        fundCategory: true,
                        expenseType: true,
                        parentTransaction: true,
                        childTransactions: true,
                    },
                },
                kegiatan: {
                    include: {
                        komisi: true,
                    },
                },
                permohonanAnggaran: {
                    include: {
                        pemohon: true,
                    },
                },
                posDana: true,
                lampiran: {
                    include: {
                        attachment: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * Create SPJ and link it to CashTransaction
     */
    static async createSpj(parokiId, userId, userName, input, file) {
        // 1. Verify Cash Transaction
        const cashTx = await database_1.prisma.cashTransaction.findUnique({
            where: { id: input.cash_transaction_id },
            include: {
                spj: true,
                permohonanAnggaran: true
            },
        });
        if (!cashTx) {
            throw api_error_1.ApiError.notFound('Transaksi kas tidak ditemukan');
        }
        if (cashTx.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Transaksi kas berada di luar paroki Anda');
        }
        if (cashTx.transactionType !== 'EXPENSE' || !cashTx.isUangMuka) {
            throw api_error_1.ApiError.badRequest('SPJ hanya dapat dibuat untuk transaksi pengeluaran uang muka');
        }
        if (cashTx.spj) {
            throw api_error_1.ApiError.badRequest('Transaksi kas sudah memiliki dokumen SPJ');
        }
        // Determine linked entities
        const finalKegiatanId = input.kegiatan_id || cashTx.permohonanAnggaran?.kegiatanId || null;
        const finalPermohonanId = input.permohonan_anggaran_id || cashTx.permohonanAnggaranId || null;
        const finalPosDanaId = cashTx.fundCategoryId || null;
        // 3. Create SPJ in transaction
        return await database_1.prisma.$transaction(async (tx) => {
            // Create SPJ
            const newSpj = await tx.spj.create({
                data: {
                    title: input.title,
                    amount: input.amount,
                    uploadedBy: userName,
                    cashTransactionId: input.cash_transaction_id,
                    kegiatanId: finalKegiatanId,
                    permohonanAnggaranId: finalPermohonanId,
                    posDanaId: finalPosDanaId,
                    status: 'PENDING',
                },
            });
            // Handle Attachment upload
            if (file) {
                const isPdf = file.mimetype === 'application/pdf';
                const attachment = await tx.attachment.create({
                    data: {
                        fileName: file.originalname,
                        fileType: isPdf ? client_1.FileType.PDF : client_1.FileType.IMAGE,
                        fileUrl: `/uploads/${file.filename}`,
                        fileSize: file.size,
                    },
                });
                await tx.spjLampiran.create({
                    data: {
                        kategoriFile: 'NOTA',
                        spjId: newSpj.id,
                        attachmentId: attachment.id,
                    },
                });
            }
            // Log Audit Trail
            const formattedAmount = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(input.amount);
            await tx.auditLog.create({
                data: {
                    type: 'SPJ',
                    action: `Mengunggah dokumen SPJ pertanggungjawaban: ${input.title} senilai ${formattedAmount} untuk transaksi ${cashTx.transactionNo}`,
                    amount: input.amount,
                    actorId: userId,
                    parokiId,
                },
            });
            // Return the complete SPJ details (re-fetched to contain relations)
            return await tx.spj.findUnique({
                where: { id: newSpj.id },
                include: {
                    cashTransaction: {
                        include: {
                            fundCategory: true,
                            expenseType: true,
                        },
                    },
                    kegiatan: {
                        include: {
                            komisi: true,
                        },
                    },
                    permohonanAnggaran: {
                        include: {
                            pemohon: true,
                        },
                    },
                    posDana: true,
                    lampiran: {
                        include: {
                            attachment: true,
                        },
                    },
                },
            });
        });
    }
    /**
     * Verify SPJ status and trigger parent cash transaction status update if matched
     */
    static async verifySpj(parokiId, userId, id, status) {
        const spj = await database_1.prisma.spj.findUnique({
            where: { id },
            include: {
                cashTransaction: true,
            },
        });
        if (!spj) {
            throw api_error_1.ApiError.notFound('Dokumen SPJ tidak ditemukan');
        }
        // Check scope of related cash transaction (or check if it belongs to this paroki)
        if (spj.cashTransaction && spj.cashTransaction.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Dokumen SPJ berada di luar paroki Anda');
        }
        return await database_1.prisma.$transaction(async (tx) => {
            const updatedSpj = await tx.spj.update({
                where: { id },
                data: { status },
                include: {
                    cashTransaction: {
                        include: {
                            fundCategory: true,
                            expenseType: true,
                        },
                    },
                    kegiatan: {
                        include: {
                            komisi: true,
                        },
                    },
                    permohonanAnggaran: {
                        include: {
                            pemohon: true,
                        },
                    },
                    posDana: true,
                    lampiran: {
                        include: {
                            attachment: true,
                        },
                    },
                },
            });
            // Status updates of the cash transaction based on SPJ validation
            if (status === 'VERIFIED' && spj.cashTransaction) {
                const parentTx = spj.cashTransaction;
                const parentAmount = Number(parentTx.amount);
                const spjAmount = Number(spj.amount);
                // If SPJ amount >= CashTransaction amount, it is fully settled (no refund needed, or spent more/equal)
                if (spjAmount >= parentAmount) {
                    await tx.cashTransaction.update({
                        where: { id: parentTx.id },
                        data: { status: 'SELESAI' },
                    });
                }
                // If SPJ amount < CashTransaction amount, it remains 'MENUNGGU_SPJ' until refund is recorded.
            }
            else if (status === 'REJECTED' && spj.cashTransaction) {
                // If SPJ is rejected, the transaction remains 'MENUNGGU_SPJ'
                await tx.cashTransaction.update({
                    where: { id: spj.cashTransaction.id },
                    data: { status: 'MENUNGGU_SPJ' },
                });
            }
            // Audit log
            await tx.auditLog.create({
                data: {
                    type: status === 'VERIFIED' ? 'APPROVE' : 'REJECT',
                    action: `Verifikasi SPJ: ${spj.title} diubah status menjadi ${status}`,
                    amount: spj.amount,
                    actorId: userId,
                    parokiId,
                },
            });
            return updatedSpj;
        });
    }
}
exports.SpjService = SpjService;
