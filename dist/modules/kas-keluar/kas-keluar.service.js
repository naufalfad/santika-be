"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.KasKeluarService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class KasKeluarService {
    /**
     * Get list of Kas Keluar records scoped to Paroki with filters
     */
    static async getKasKeluar(parokiId, filters) {
        const whereClause = {
            parokiId,
        };
        if (filters.kategori) {
            whereClause.kategori = filters.kategori;
        }
        if (filters.budgetItemId) {
            whereClause.budgetItemId = filters.budgetItemId;
        }
        if (filters.startDate || filters.endDate) {
            whereClause.tanggal = {};
            if (filters.startDate) {
                whereClause.tanggal.gte = filters.startDate;
            }
            if (filters.endDate) {
                whereClause.tanggal.lte = filters.endDate;
            }
        }
        if (filters.search) {
            whereClause.penerima = { contains: filters.search, mode: 'insensitive' };
        }
        return await database_1.prisma.kasKeluar.findMany({
            where: whereClause,
            include: {
                attachment: true,
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
            },
            orderBy: [
                { tanggal: 'desc' },
                { createdAt: 'desc' },
            ],
        });
    }
    /**
     * Create a new Kas Keluar record (legacy)
     */
    static async createKasKeluar(parokiId, actorId, input, file) {
        return await database_1.prisma.$transaction(async (tx) => {
            let attachmentId = undefined;
            // 1. Process budget check if budgetItemId is supplied
            if (input.budgetItemId) {
                const budgetItem = await tx.budgetItem.findUnique({
                    where: { id: input.budgetItemId },
                    include: { budget: true },
                });
                if (!budgetItem) {
                    throw api_error_1.ApiError.notFound('Pos Anggaran tidak ditemukan');
                }
                if (budgetItem.budget.parokiId !== parokiId) {
                    throw api_error_1.ApiError.forbidden('Pos Anggaran berada di luar paroki Anda');
                }
                // Calculate sisa dynamically
                const realAgg = await tx.cashTransaction.aggregate({
                    where: {
                        budgetItemId: input.budgetItemId,
                        transactionType: 'EXPENSE',
                    },
                    _sum: { amount: true },
                });
                const currentRealisasi = Number(realAgg._sum.amount || 0);
                const sisa = Number(budgetItem.plafon) - currentRealisasi;
                if (input.jumlah > sisa) {
                    throw api_error_1.ApiError.badRequest(`Plafon anggaran tidak mencukupi. Sisa: Rp ${sisa.toLocaleString('id-ID')}, Dibutuhkan: Rp ${input.jumlah.toLocaleString('id-ID')}`);
                }
            }
            // 2. Handle File Attachment
            if (file) {
                const isPdf = file.mimetype === 'application/pdf';
                const newAttachment = await tx.attachment.create({
                    data: {
                        fileName: file.originalname,
                        fileType: isPdf ? 'PDF' : 'IMAGE',
                        fileUrl: `/uploads/${file.filename}`,
                        fileSize: file.size,
                    },
                });
                attachmentId = newAttachment.id;
            }
            // 3. Create Kas Keluar record
            const newTransaction = await tx.kasKeluar.create({
                data: {
                    tanggal: input.tanggal,
                    kategori: input.kategori,
                    penerima: input.penerima,
                    jumlah: input.jumlah,
                    status: 'Selesai',
                    budgetItemId: input.budgetItemId || null,
                    attachmentId: attachmentId || null,
                    parokiId,
                },
                include: {
                    attachment: true,
                    budgetItem: true,
                },
            });
            // 4. Create Audit Log
            const formattedAmount = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(input.jumlah);
            await tx.auditLog.create({
                data: {
                    type: 'OUT',
                    action: `Mencatat Kas Keluar (Legacy) untuk ${input.penerima} kategori ${input.kategori} senilai ${formattedAmount}`,
                    amount: input.jumlah,
                    actorId,
                    parokiId,
                },
            });
            return newTransaction;
        });
    }
    /**
     * Update an existing Kas Keluar record (legacy)
     */
    static async updateKasKeluar(parokiId, actorId, id, input, file) {
        return await database_1.prisma.$transaction(async (tx) => {
            // 1. Fetch existing record and boundaries
            const existing = await tx.kasKeluar.findUnique({
                where: { id },
                include: { attachment: true, budgetItem: true },
            });
            if (!existing) {
                throw api_error_1.ApiError.notFound('Transaksi Kas Keluar tidak ditemukan');
            }
            if (existing.parokiId !== parokiId) {
                throw api_error_1.ApiError.forbidden('Anda tidak memiliki akses untuk mengubah transaksi ini');
            }
            const updatedJumlah = input.jumlah !== undefined ? input.jumlah : Number(existing.jumlah);
            const updatedBudgetItemId = input.budgetItemId !== undefined ? input.budgetItemId : existing.budgetItemId;
            // 2. Budget adjustment checking if budget item OR amount changed
            const budgetOrAmountChanged = updatedJumlah !== Number(existing.jumlah) || updatedBudgetItemId !== existing.budgetItemId;
            if (budgetOrAmountChanged && updatedBudgetItemId) {
                const budgetItem = await tx.budgetItem.findUnique({
                    where: { id: updatedBudgetItemId },
                    include: { budget: true },
                });
                if (!budgetItem) {
                    throw api_error_1.ApiError.notFound('Pos Anggaran baru tidak ditemukan');
                }
                if (budgetItem.budget.parokiId !== parokiId) {
                    throw api_error_1.ApiError.forbidden('Pos Anggaran baru berada di luar paroki Anda');
                }
                // Calculate sisa dynamically
                const realAgg = await tx.cashTransaction.aggregate({
                    where: {
                        budgetItemId: updatedBudgetItemId,
                        transactionType: 'EXPENSE',
                    },
                    _sum: { amount: true },
                });
                const currentRealisasi = Number(realAgg._sum.amount || 0);
                const sisa = Number(budgetItem.plafon) - currentRealisasi;
                if (updatedJumlah > sisa) {
                    throw api_error_1.ApiError.badRequest(`Plafon anggaran baru tidak mencukupi. Sisa: Rp ${sisa.toLocaleString('id-ID')}, Dibutuhkan: Rp ${updatedJumlah.toLocaleString('id-ID')}`);
                }
            }
            // 3. Handle File Attachment updates
            let attachmentId = existing.attachmentId;
            let fileToDelete = null;
            if (file) {
                // Schedule old file for physical deletion
                if (existing.attachment) {
                    fileToDelete = existing.attachment.fileUrl;
                }
                // Save new attachment
                const isPdf = file.mimetype === 'application/pdf';
                const newAttachment = await tx.attachment.create({
                    data: {
                        fileName: file.originalname,
                        fileType: isPdf ? 'PDF' : 'IMAGE',
                        fileUrl: `/uploads/${file.filename}`,
                        fileSize: file.size,
                    },
                });
                attachmentId = newAttachment.id;
            }
            // 4. Update transaction
            const updated = await tx.kasKeluar.update({
                where: { id },
                data: {
                    tanggal: input.tanggal,
                    kategori: input.kategori,
                    penerima: input.penerima,
                    jumlah: input.jumlah,
                    budgetItemId: updatedBudgetItemId,
                    attachmentId,
                },
                include: { attachment: true, budgetItem: true },
            });
            // 5. Clean up old attachment file and DB record if overridden
            if (file && existing.attachment) {
                await tx.attachment.delete({
                    where: { id: existing.attachment.id },
                });
                if (fileToDelete) {
                    const relativePath = fileToDelete.startsWith('/') ? fileToDelete.substring(1) : fileToDelete;
                    const fullPath = path_1.default.join(process.cwd(), relativePath);
                    try {
                        if (fs_1.default.existsSync(fullPath)) {
                            fs_1.default.unlinkSync(fullPath);
                        }
                    }
                    catch (err) {
                        console.error('Failed to delete physical file during update:', err);
                    }
                }
            }
            // 6. Write Audit Log
            const formattedAmount = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(updatedJumlah);
            const targetPenerima = input.penerima || existing.penerima;
            await tx.auditLog.create({
                data: {
                    type: 'OUT',
                    action: `Memperbarui transaksi Kas Keluar (Legacy): ${targetPenerima} senilai ${formattedAmount}`,
                    amount: updatedJumlah,
                    actorId,
                    parokiId,
                },
            });
            return updated;
        });
    }
    /**
     * Delete a Kas Keluar record (legacy)
     */
    static async deleteKasKeluar(parokiId, actorId, id) {
        return await database_1.prisma.$transaction(async (tx) => {
            // 1. Fetch transaction and boundaries
            const existing = await tx.kasKeluar.findUnique({
                where: { id },
                include: { attachment: true, budgetItem: true },
            });
            if (!existing) {
                throw api_error_1.ApiError.notFound('Transaksi Kas Keluar tidak ditemukan');
            }
            if (existing.parokiId !== parokiId) {
                throw api_error_1.ApiError.forbidden('Anda tidak memiliki akses untuk menghapus transaksi ini');
            }
            // 2. Delete Kas Keluar record
            await tx.kasKeluar.delete({
                where: { id },
            });
            // 3. Delete attachment file and record if any
            if (existing.attachment) {
                await tx.attachment.delete({
                    where: { id: existing.attachment.id },
                });
                const fileToDelete = existing.attachment.fileUrl;
                const relativePath = fileToDelete.startsWith('/') ? fileToDelete.substring(1) : fileToDelete;
                const fullPath = path_1.default.join(process.cwd(), relativePath);
                try {
                    if (fs_1.default.existsSync(fullPath)) {
                        fs_1.default.unlinkSync(fullPath);
                    }
                }
                catch (err) {
                    console.error('Failed to delete physical file during deletion:', err);
                }
            }
            // 4. Write Audit Log
            const formattedAmount = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(Number(existing.jumlah));
            await tx.auditLog.create({
                data: {
                    type: 'OUT',
                    action: `Menghapus transaksi Kas Keluar (Legacy): ${existing.penerima} yang bernilai ${formattedAmount}`,
                    amount: existing.jumlah,
                    actorId,
                    parokiId,
                },
            });
            return existing;
        });
    }
}
exports.KasKeluarService = KasKeluarService;
