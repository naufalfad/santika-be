"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseTypeService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
class ExpenseTypeService {
    static async getExpenseTypes(parokiId) {
        return await database_1.prisma.expenseType.findMany({
            where: { parokiId },
            orderBy: { code: 'asc' },
        });
    }
    static async createExpenseType(parokiId, input) {
        // Check code duplication
        const existingCode = await database_1.prisma.expenseType.findUnique({
            where: {
                parokiId_code: {
                    parokiId,
                    code: input.code,
                },
            },
        });
        if (existingCode) {
            throw api_error_1.ApiError.badRequest(`Kode Jenis Pengeluaran "${input.code}" sudah terdaftar`);
        }
        // Check name duplication
        const existingName = await database_1.prisma.expenseType.findUnique({
            where: {
                parokiId_name: {
                    parokiId,
                    name: input.name,
                },
            },
        });
        if (existingName) {
            throw api_error_1.ApiError.badRequest(`Nama Jenis Pengeluaran "${input.name}" sudah terdaftar`);
        }
        return await database_1.prisma.expenseType.create({
            data: {
                code: input.code,
                name: input.name,
                description: input.description,
                isActive: input.isActive !== undefined ? input.isActive : true,
                parokiId,
            },
        });
    }
    static async updateExpenseType(parokiId, id, input) {
        const existing = await database_1.prisma.expenseType.findUnique({
            where: { id },
        });
        if (!existing) {
            throw api_error_1.ApiError.notFound('Jenis Pengeluaran tidak ditemukan');
        }
        if (existing.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Jenis Pengeluaran berada di luar paroki Anda');
        }
        // Unique checks if changed
        if (input.code && input.code !== existing.code) {
            const codeDup = await database_1.prisma.expenseType.findUnique({
                where: {
                    parokiId_code: {
                        parokiId,
                        code: input.code,
                    },
                },
            });
            if (codeDup) {
                throw api_error_1.ApiError.badRequest(`Kode Jenis Pengeluaran "${input.code}" sudah terdaftar`);
            }
        }
        if (input.name && input.name !== existing.name) {
            const nameDup = await database_1.prisma.expenseType.findUnique({
                where: {
                    parokiId_name: {
                        parokiId,
                        name: input.name,
                    },
                },
            });
            if (nameDup) {
                throw api_error_1.ApiError.badRequest(`Nama Jenis Pengeluaran "${input.name}" sudah terdaftar`);
            }
        }
        return await database_1.prisma.expenseType.update({
            where: { id },
            data: {
                code: input.code,
                name: input.name,
                description: input.description,
                isActive: input.isActive,
            },
        });
    }
    static async deleteExpenseType(parokiId, id) {
        const existing = await database_1.prisma.expenseType.findUnique({
            where: { id },
        });
        if (!existing) {
            throw api_error_1.ApiError.notFound('Jenis Pengeluaran tidak ditemukan');
        }
        if (existing.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Jenis Pengeluaran berada di luar paroki Anda');
        }
        // Check transactions
        const transCount = await database_1.prisma.cashTransaction.count({
            where: { expenseTypeId: id },
        });
        if (transCount > 0) {
            throw api_error_1.ApiError.badRequest('Tidak dapat menghapus Jenis Pengeluaran yang sudah memiliki transaksi terkait');
        }
        return await database_1.prisma.expenseType.delete({
            where: { id },
        });
    }
}
exports.ExpenseTypeService = ExpenseTypeService;
