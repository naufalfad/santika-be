"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnggaranService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
class AnggaranService {
    /**
     * Get list of Budget headers scoped to Paroki with filters and dynamic aggregates
     */
    static async getAnggaran(parokiId, filters) {
        const whereClause = {
            parokiId,
        };
        if (filters.tahun !== undefined) {
            whereClause.tahun = filters.tahun;
        }
        if (filters.fund_category_id !== undefined) {
            whereClause.fundCategoryId = filters.fund_category_id;
        }
        const budgets = await database_1.prisma.budget.findMany({
            where: whereClause,
            include: {
                fundCategory: true,
                items: {
                    include: {
                        komisi: true,
                    },
                    orderBy: {
                        name: 'asc',
                    },
                },
            },
            orderBy: {
                tahun: 'desc',
            },
        });
        // Extract all item IDs to aggregate cash transactions
        const itemIds = budgets.flatMap((b) => b.items.map((i) => i.id));
        // Fetch realization (CashTransaction EXPENSE) grouped by budgetItemId
        const aggregations = await database_1.prisma.cashTransaction.groupBy({
            by: ['budgetItemId'],
            where: {
                budgetItemId: { in: itemIds },
                transactionType: 'EXPENSE',
            },
            _sum: { amount: true },
        });
        const realisasiMap = {};
        aggregations.forEach((agg) => {
            if (agg.budgetItemId) {
                realisasiMap[agg.budgetItemId] = Number(agg._sum.amount || 0);
            }
        });
        // Map computed values back to results
        return budgets.map((budget) => {
            const items = budget.items.map((item) => {
                const realisasi = realisasiMap[item.id] || 0;
                const sisa = Number(item.plafon) - realisasi;
                const persentase = Number(item.plafon) > 0 ? Math.round((realisasi / Number(item.plafon)) * 100) : 0;
                return {
                    ...item,
                    plafon: Number(item.plafon),
                    realisasi,
                    sisa,
                    persentase,
                };
            });
            const totalPlafon = items.reduce((sum, i) => sum + i.plafon, 0);
            const totalRealisasi = items.reduce((sum, i) => sum + i.realisasi, 0);
            const totalSisa = totalPlafon - totalRealisasi;
            return {
                ...budget,
                items,
                totalPlafon,
                totalRealisasi,
                totalSisa,
            };
        });
    }
    /**
     * Get list of Komisi scoped to Paroki
     */
    static async getKomisi(parokiId) {
        return await database_1.prisma.komisi.findMany({
            where: { parokiId },
            orderBy: { nama: 'asc' },
        });
    }
    /**
     * Create a new Budget header with nested items in a transaction
     */
    static async createAnggaran(parokiId, actorId, input) {
        // 1. Verify Pos Dana
        const fund = await database_1.prisma.fundCategory.findUnique({
            where: { id: input.fund_category_id },
        });
        if (!fund) {
            throw api_error_1.ApiError.notFound('Pos Dana tidak ditemukan');
        }
        if (fund.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Pos Dana berada di luar paroki Anda');
        }
        // 2. Prevent duplicate budget header for the same Pos Dana and Year
        const existing = await database_1.prisma.budget.findFirst({
            where: {
                parokiId,
                fundCategoryId: input.fund_category_id,
                tahun: input.tahun,
            },
        });
        if (existing) {
            // 3. Validate commissions if supplied
            for (const item of input.items) {
                if (item.komisiId) {
                    const komisi = await database_1.prisma.komisi.findUnique({
                        where: { id: item.komisiId },
                    });
                    if (!komisi) {
                        throw api_error_1.ApiError.notFound(`Komisi dengan ID ${item.komisiId} tidak ditemukan`);
                    }
                    if (komisi.parokiId !== parokiId) {
                        throw api_error_1.ApiError.forbidden('Komisi berada di luar paroki Anda');
                    }
                }
            }
            // Append new items to existing budget header
            return await database_1.prisma.$transaction(async (tx) => {
                const items = await Promise.all(input.items.map(async (item) => {
                    return await tx.budgetItem.create({
                        data: {
                            budgetId: existing.id,
                            name: item.name,
                            plafon: item.plafon,
                            komisiId: item.komisiId || null,
                        },
                        include: {
                            komisi: true,
                        },
                    });
                }));
                // Log Audit Trail
                const totalPlafon = items.reduce((sum, i) => sum + Number(i.plafon), 0);
                const formattedPlafon = new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0,
                }).format(totalPlafon);
                await tx.auditLog.create({
                    data: {
                        type: 'IN',
                        action: `Menambahkan item anggaran baru ke Pos Dana ${fund.name} tahun ${input.tahun} senilai ${formattedPlafon}`,
                        amount: totalPlafon,
                        actorId,
                        parokiId,
                    },
                });
                // Get all items in the budget now
                const allItems = await tx.budgetItem.findMany({
                    where: { budgetId: existing.id },
                    include: { komisi: true },
                });
                // Fetch aggregates to calculate remaining balance
                const aggregations = await tx.cashTransaction.groupBy({
                    by: ['budgetItemId'],
                    where: {
                        budgetItemId: { in: allItems.map((i) => i.id) },
                        transactionType: 'EXPENSE',
                    },
                    _sum: { amount: true },
                });
                const realisasiMap = {};
                aggregations.forEach((agg) => {
                    if (agg.budgetItemId) {
                        realisasiMap[agg.budgetItemId] = Number(agg._sum.amount || 0);
                    }
                });
                const itemsWithRealisasi = allItems.map((item) => {
                    const realisasi = realisasiMap[item.id] || 0;
                    const sisa = Number(item.plafon) - realisasi;
                    const persentase = Number(item.plafon) > 0 ? Math.round((realisasi / Number(item.plafon)) * 100) : 0;
                    return {
                        ...item,
                        plafon: Number(item.plafon),
                        realisasi,
                        sisa,
                        persentase,
                    };
                });
                const totalPlafonSum = itemsWithRealisasi.reduce((sum, i) => sum + i.plafon, 0);
                const totalRealisasiSum = itemsWithRealisasi.reduce((sum, i) => sum + i.realisasi, 0);
                const totalSisaSum = totalPlafonSum - totalRealisasiSum;
                return {
                    ...existing,
                    fundCategory: fund,
                    items: itemsWithRealisasi,
                    totalPlafon: totalPlafonSum,
                    totalRealisasi: totalRealisasiSum,
                    totalSisa: totalSisaSum,
                };
            });
        }
        // 3. Validate commissions if supplied
        for (const item of input.items) {
            if (item.komisiId) {
                const komisi = await database_1.prisma.komisi.findUnique({
                    where: { id: item.komisiId },
                });
                if (!komisi) {
                    throw api_error_1.ApiError.notFound(`Komisi dengan ID ${item.komisiId} tidak ditemukan`);
                }
                if (komisi.parokiId !== parokiId) {
                    throw api_error_1.ApiError.forbidden('Komisi berada di luar paroki Anda');
                }
            }
        }
        // 4. Create header and items inside transaction
        return await database_1.prisma.$transaction(async (tx) => {
            const budget = await tx.budget.create({
                data: {
                    tahun: input.tahun,
                    fundCategoryId: input.fund_category_id,
                    parokiId,
                },
            });
            const items = await Promise.all(input.items.map(async (item) => {
                return await tx.budgetItem.create({
                    data: {
                        budgetId: budget.id,
                        name: item.name,
                        plafon: item.plafon,
                        komisiId: item.komisiId || null,
                    },
                    include: {
                        komisi: true,
                    },
                });
            }));
            // Log Audit Trail
            const totalPlafon = items.reduce((sum, i) => sum + Number(i.plafon), 0);
            const formattedPlafon = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(totalPlafon);
            await tx.auditLog.create({
                data: {
                    type: 'IN',
                    action: `Mengalokasikan anggaran Pos Dana ${fund.name} tahun ${input.tahun} senilai ${formattedPlafon}`,
                    amount: totalPlafon,
                    actorId,
                    parokiId,
                },
            });
            return {
                ...budget,
                fundCategory: fund,
                items,
                totalPlafon,
                totalRealisasi: 0,
                totalSisa: totalPlafon,
            };
        });
    }
    /**
     * Update Budget header and nested items list (add, update, delete)
     */
    static async updateAnggaran(parokiId, actorId, id, input) {
        // 1. Fetch budget header and verify boundaries
        const existing = await database_1.prisma.budget.findUnique({
            where: { id },
            include: { fundCategory: true },
        });
        if (!existing) {
            throw api_error_1.ApiError.notFound('Data Anggaran tidak ditemukan');
        }
        if (existing.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Anda tidak memiliki akses untuk mengubah anggaran ini');
        }
        return await database_1.prisma.$transaction(async (tx) => {
            // 2. Update year if requested
            if (input.tahun !== undefined && input.tahun !== existing.tahun) {
                const duplicate = await tx.budget.findFirst({
                    where: {
                        parokiId,
                        fundCategoryId: existing.fundCategoryId,
                        tahun: input.tahun,
                        id: { not: id },
                    },
                });
                if (duplicate) {
                    throw api_error_1.ApiError.badRequest(`Anggaran untuk Pos Dana tersebut pada tahun ${input.tahun} sudah dialokasikan`);
                }
                await tx.budget.update({
                    where: { id },
                    data: { tahun: input.tahun },
                });
            }
            // 3. Reconcile items array if supplied
            if (input.items !== undefined) {
                const dbItems = await tx.budgetItem.findMany({
                    where: { budgetId: id },
                });
                const inputItemIds = input.items.map((i) => i.id).filter(Boolean);
                // A. Delete items that were removed in the request payload
                const itemsToDelete = dbItems.filter((dbi) => !inputItemIds.includes(dbi.id));
                for (const itemToDelete of itemsToDelete) {
                    // Check for transaction attachments
                    const txCount = await tx.cashTransaction.count({
                        where: { budgetItemId: itemToDelete.id },
                    });
                    if (txCount > 0) {
                        throw api_error_1.ApiError.badRequest(`Tidak dapat menghapus item anggaran "${itemToDelete.name}" karena sudah memiliki transaksi terkait`);
                    }
                    await tx.budgetItem.delete({
                        where: { id: itemToDelete.id },
                    });
                }
                // B. Update existing items or Create new items
                for (const item of input.items) {
                    if (item.komisiId) {
                        const komisi = await tx.komisi.findUnique({
                            where: { id: item.komisiId },
                        });
                        if (!komisi || komisi.parokiId !== parokiId) {
                            throw api_error_1.ApiError.badRequest(`Komisi ID ${item.komisiId} tidak valid`);
                        }
                    }
                    if (item.id) {
                        // Update
                        const dbItem = dbItems.find((dbi) => dbi.id === item.id);
                        if (!dbItem) {
                            throw api_error_1.ApiError.notFound(`Item anggaran ID ${item.id} tidak ditemukan`);
                        }
                        // Check plafon is not below dynamic realization sum
                        const agg = await tx.cashTransaction.aggregate({
                            where: { budgetItemId: item.id, transactionType: 'EXPENSE' },
                            _sum: { amount: true },
                        });
                        const realisasi = Number(agg._sum.amount || 0);
                        if (item.plafon < realisasi) {
                            throw api_error_1.ApiError.badRequest(`Plafon baru untuk item "${item.name}" tidak boleh lebih kecil dari realisasi aktual (Rp ${realisasi.toLocaleString('id-ID')})`);
                        }
                        await tx.budgetItem.update({
                            where: { id: item.id },
                            data: {
                                name: item.name,
                                plafon: item.plafon,
                                komisiId: item.komisiId || null,
                            },
                        });
                    }
                    else {
                        // Create
                        await tx.budgetItem.create({
                            data: {
                                budgetId: id,
                                name: item.name,
                                plafon: item.plafon,
                                komisiId: item.komisiId || null,
                            },
                        });
                    }
                }
            }
            // Fetch newly updated budget with computed items
            const updatedBudget = await tx.budget.findUnique({
                where: { id },
                include: {
                    fundCategory: true,
                    items: {
                        include: { komisi: true },
                        orderBy: { name: 'asc' },
                    },
                },
            });
            // Calculate dynamic summaries
            const items = updatedBudget?.items || [];
            const itemIds = items.map((i) => i.id);
            const aggregations = await tx.cashTransaction.groupBy({
                by: ['budgetItemId'],
                where: {
                    budgetItemId: { in: itemIds },
                    transactionType: 'EXPENSE',
                },
                _sum: { amount: true },
            });
            const realisasiMap = {};
            aggregations.forEach((agg) => {
                if (agg.budgetItemId) {
                    realisasiMap[agg.budgetItemId] = Number(agg._sum.amount || 0);
                }
            });
            const itemsWithRealisasi = items.map((item) => {
                const realisasi = realisasiMap[item.id] || 0;
                const sisa = Number(item.plafon) - realisasi;
                const persentase = Number(item.plafon) > 0 ? Math.round((realisasi / Number(item.plafon)) * 100) : 0;
                return {
                    ...item,
                    plafon: Number(item.plafon),
                    realisasi,
                    sisa,
                    persentase,
                };
            });
            const totalPlafon = itemsWithRealisasi.reduce((sum, i) => sum + i.plafon, 0);
            const totalRealisasi = itemsWithRealisasi.reduce((sum, i) => sum + i.realisasi, 0);
            const totalSisa = totalPlafon - totalRealisasi;
            // Write Audit Log
            const formattedPlafon = new Intl.NumberFormat('id-ID', {
                style: 'currency',
                currency: 'IDR',
                minimumFractionDigits: 0,
            }).format(totalPlafon);
            await tx.auditLog.create({
                data: {
                    type: 'IN',
                    action: `Memperbarui alokasi anggaran Pos Dana ${existing.fundCategory.name} tahun ${updatedBudget?.tahun || existing.tahun} senilai ${formattedPlafon}`,
                    amount: totalPlafon,
                    actorId,
                    parokiId,
                },
            });
            return {
                ...updatedBudget,
                items: itemsWithRealisasi,
                totalPlafon,
                totalRealisasi,
                totalSisa,
            };
        });
    }
    /**
     * Fetch budget dashboard data per Pos Dana and per BudgetItem
     */
    static async getAnggaranDashboard(parokiId, filters) {
        const budgets = await database_1.prisma.budget.findMany({
            where: {
                parokiId,
                tahun: filters.tahun,
                ...(filters.fund_category_id && { fundCategoryId: filters.fund_category_id }),
            },
            include: {
                fundCategory: true,
                items: true,
            },
        });
        const itemIds = budgets.flatMap((b) => b.items.map((i) => i.id));
        // Fetch dynamic realizations
        const aggregations = await database_1.prisma.cashTransaction.groupBy({
            by: ['budgetItemId'],
            where: {
                budgetItemId: { in: itemIds },
                transactionType: 'EXPENSE',
            },
            _sum: { amount: true },
        });
        const realisasiMap = {};
        aggregations.forEach((agg) => {
            if (agg.budgetItemId) {
                realisasiMap[agg.budgetItemId] = Number(agg._sum.amount || 0);
            }
        });
        // 1. Calculate summaries per Pos Dana (FundCategory)
        const perPosDana = budgets.map((budget) => {
            let totalPlafon = 0;
            let totalRealisasi = 0;
            budget.items.forEach((item) => {
                const plafon = Number(item.plafon);
                const realisasi = realisasiMap[item.id] || 0;
                totalPlafon += plafon;
                totalRealisasi += realisasi;
            });
            const totalSisa = totalPlafon - totalRealisasi;
            const persentase = totalPlafon > 0 ? Math.round((totalRealisasi / totalPlafon) * 100) : 0;
            return {
                fund_category_id: budget.fundCategory.id,
                fund_code: budget.fundCategory.code,
                fund_name: budget.fundCategory.name,
                anggaran: totalPlafon,
                realisasi: totalRealisasi,
                sisa: totalSisa,
                persentase,
            };
        });
        // 2. Calculate summaries per BudgetItem
        const perItem = budgets.flatMap((budget) => {
            return budget.items.map((item) => {
                const plafon = Number(item.plafon);
                const realisasi = realisasiMap[item.id] || 0;
                const sisa = plafon - realisasi;
                const persentase = plafon > 0 ? Math.round((realisasi / plafon) * 100) : 0;
                return {
                    item_id: item.id,
                    item_name: item.name,
                    fund_name: budget.fundCategory.name,
                    anggaran: plafon,
                    realisasi,
                    sisa,
                    persentase,
                };
            });
        });
        return {
            tahun: filters.tahun,
            perPosDana,
            perItem,
        };
    }
}
exports.AnggaranService = AnggaranService;
