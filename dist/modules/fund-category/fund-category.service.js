"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FundCategoryService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
class FundCategoryService {
    /**
     * Get all fund categories scoped to Paroki
     */
    static async getFundCategories(parokiId) {
        return await database_1.prisma.fundCategory.findMany({
            where: { parokiId },
            orderBy: { code: 'asc' },
        });
    }
    /**
     * Create new fund category
     */
    static async createFundCategory(parokiId, input) {
        // Check code duplication in paroki
        const existingCode = await database_1.prisma.fundCategory.findUnique({
            where: {
                parokiId_code: {
                    parokiId,
                    code: input.code,
                },
            },
        });
        if (existingCode) {
            throw api_error_1.ApiError.badRequest(`Kode Pos Dana "${input.code}" sudah terdaftar`);
        }
        // Check name duplication in paroki
        const existingName = await database_1.prisma.fundCategory.findUnique({
            where: {
                parokiId_name: {
                    parokiId,
                    name: input.name,
                },
            },
        });
        if (existingName) {
            throw api_error_1.ApiError.badRequest(`Nama Pos Dana "${input.name}" sudah terdaftar`);
        }
        return await database_1.prisma.fundCategory.create({
            data: {
                code: input.code,
                name: input.name,
                description: input.description,
                isActive: input.isActive !== undefined ? input.isActive : true,
                parokiId,
            },
        });
    }
    /**
     * Update fund category
     */
    static async updateFundCategory(parokiId, id, input) {
        const existing = await database_1.prisma.fundCategory.findUnique({
            where: { id },
        });
        if (!existing) {
            throw api_error_1.ApiError.notFound('Pos Dana tidak ditemukan');
        }
        if (existing.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Pos Dana berada di luar paroki Anda');
        }
        // Unique checks if changed
        if (input.code && input.code !== existing.code) {
            const codeDup = await database_1.prisma.fundCategory.findUnique({
                where: {
                    parokiId_code: {
                        parokiId,
                        code: input.code,
                    },
                },
            });
            if (codeDup) {
                throw api_error_1.ApiError.badRequest(`Kode Pos Dana "${input.code}" sudah terdaftar`);
            }
        }
        if (input.name && input.name !== existing.name) {
            const nameDup = await database_1.prisma.fundCategory.findUnique({
                where: {
                    parokiId_name: {
                        parokiId,
                        name: input.name,
                    },
                },
            });
            if (nameDup) {
                throw api_error_1.ApiError.badRequest(`Nama Pos Dana "${input.name}" sudah terdaftar`);
            }
        }
        return await database_1.prisma.fundCategory.update({
            where: { id },
            data: {
                code: input.code,
                name: input.name,
                description: input.description,
                isActive: input.isActive,
            },
        });
    }
    /**
     * Delete fund category
     */
    static async deleteFundCategory(parokiId, id) {
        const existing = await database_1.prisma.fundCategory.findUnique({
            where: { id },
        });
        if (!existing) {
            throw api_error_1.ApiError.notFound('Pos Dana tidak ditemukan');
        }
        if (existing.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Pos Dana berada di luar paroki Anda');
        }
        // Check if any transactions reference it
        const transCount = await database_1.prisma.cashTransaction.count({
            where: { fundCategoryId: id },
        });
        if (transCount > 0) {
            throw api_error_1.ApiError.badRequest('Tidak dapat menghapus Pos Dana yang sudah memiliki transaksi terkait');
        }
        return await database_1.prisma.fundCategory.delete({
            where: { id },
        });
    }
    /**
     * Get dynamic balances for all fund categories computed from transactions
     */
    static async getFundBalances(parokiId) {
        const funds = await database_1.prisma.fundCategory.findMany({
            where: { parokiId },
            orderBy: { name: 'asc' },
        });
        const incomes = await database_1.prisma.cashTransaction.groupBy({
            by: ['fundCategoryId'],
            where: {
                parokiId,
                transactionType: 'INCOME',
            },
            _sum: {
                amount: true,
            },
        });
        const expenses = await database_1.prisma.cashTransaction.groupBy({
            by: ['fundCategoryId'],
            where: {
                parokiId,
                transactionType: 'EXPENSE',
            },
            _sum: {
                amount: true,
            },
        });
        const incomeMap = new Map();
        incomes.forEach((i) => {
            incomeMap.set(i.fundCategoryId, Number(i._sum.amount || 0));
        });
        const expenseMap = new Map();
        expenses.forEach((e) => {
            expenseMap.set(e.fundCategoryId, Number(e._sum.amount || 0));
        });
        return funds.map((fund) => {
            const inc = incomeMap.get(fund.id) || 0;
            const exp = expenseMap.get(fund.id) || 0;
            return {
                id: fund.id,
                code: fund.code,
                fund: fund.name,
                income: inc,
                expense: exp,
                balance: inc - exp,
                isActive: fund.isActive,
            };
        });
    }
}
exports.FundCategoryService = FundCategoryService;
