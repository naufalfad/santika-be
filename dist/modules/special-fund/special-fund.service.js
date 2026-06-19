"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpecialFundService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
const client_1 = require("@prisma/client");
class SpecialFundService {
    /**
     * Create a new Special Fund
     */
    static async createSpecialFund(parokiId, userId, input) {
        if (input.tanggalMulai > input.tanggalSelesai) {
            throw api_error_1.ApiError.badRequest('Tanggal mulai tidak boleh melebihi tanggal selesai');
        }
        if (input.targetNominal !== undefined && input.targetNominal < 0) {
            throw api_error_1.ApiError.badRequest('Target nominal tidak boleh kurang dari 0');
        }
        // Check code uniqueness in Paroki for SpecialFund
        const existing = await database_1.prisma.specialFund.findUnique({
            where: {
                parokiId_code: {
                    parokiId,
                    code: input.code,
                },
            },
        });
        if (existing) {
            throw api_error_1.ApiError.badRequest(`Kode Dana Khusus "${input.code}" sudah terdaftar`);
        }
        // Check code uniqueness in Paroki for FundCategory
        const existingCategoryCode = await database_1.prisma.fundCategory.findUnique({
            where: {
                parokiId_code: {
                    parokiId,
                    code: input.code,
                },
            },
        });
        if (existingCategoryCode) {
            throw api_error_1.ApiError.badRequest(`Kode Pos Dana "${input.code}" sudah terdaftar`);
        }
        const existingCategoryName = await database_1.prisma.fundCategory.findUnique({
            where: {
                parokiId_name: {
                    parokiId,
                    name: `Dana Khusus: ${input.name}`,
                },
            },
        });
        if (existingCategoryName) {
            throw api_error_1.ApiError.badRequest(`Nama Pos Dana "Dana Khusus: ${input.name}" sudah terdaftar`);
        }
        const specialFund = await database_1.prisma.$transaction(async (tx) => {
            // 1. Create FundCategory
            const fundCategory = await tx.fundCategory.create({
                data: {
                    code: input.code,
                    name: `Dana Khusus: ${input.name}`,
                    description: input.description || `Pos Dana Khusus untuk ${input.name}`,
                    isActive: true,
                    parokiId,
                },
            });
            // 2. Create SpecialFund linked to FundCategory
            const fund = await tx.specialFund.create({
                data: {
                    code: input.code,
                    name: input.name,
                    description: input.description,
                    tujuanPenggalangan: input.tujuanPenggalangan,
                    targetNominal: input.targetNominal,
                    tanggalMulai: input.tanggalMulai,
                    tanggalSelesai: input.tanggalSelesai,
                    status: client_1.SpecialFundStatus.DRAFT,
                    parokiId,
                    fundCategoryId: fundCategory.id,
                },
            });
            // 3. Write Audit Log
            await tx.auditLog.create({
                data: {
                    type: 'SPECIAL_FUND',
                    action: `Membuat Dana Khusus baru: ${fund.name} (${fund.code})`,
                    actorId: userId,
                    parokiId,
                    newData: JSON.parse(JSON.stringify(fund)),
                },
            });
            return fund;
        });
        return specialFund;
    }
    /**
     * Get all Special Funds in Paroki
     */
    static async getSpecialFunds(parokiId, status) {
        return await database_1.prisma.specialFund.findMany({
            where: {
                parokiId,
                ...(status ? { status: status } : {}),
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    /**
     * Get Special Fund by ID
     */
    static async getSpecialFundById(parokiId, id) {
        const fund = await database_1.prisma.specialFund.findUnique({
            where: { id },
            include: {
                allocations: {
                    include: {
                        targetPosDana: true,
                        createdBy: {
                            select: { id: true, name: true, email: true },
                        },
                    },
                },
            },
        });
        if (!fund) {
            throw api_error_1.ApiError.notFound('Dana Khusus tidak ditemukan');
        }
        if (fund.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
        }
        return fund;
    }
    /**
     * Update Special Fund
     */
    static async updateSpecialFund(parokiId, id, userId, input) {
        const existing = await database_1.prisma.specialFund.findUnique({
            where: { id },
        });
        if (!existing) {
            throw api_error_1.ApiError.notFound('Dana Khusus tidak ditemukan');
        }
        if (existing.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
        }
        if (existing.status !== client_1.SpecialFundStatus.DRAFT) {
            throw api_error_1.ApiError.badRequest('Hanya Dana Khusus berstatus DRAFT yang dapat diubah');
        }
        const tMulai = input.tanggalMulai || existing.tanggalMulai;
        const tSelesai = input.tanggalSelesai || existing.tanggalSelesai;
        if (tMulai > tSelesai) {
            throw api_error_1.ApiError.badRequest('Tanggal mulai tidak boleh melebihi tanggal selesai');
        }
        if (input.targetNominal !== undefined && input.targetNominal < 0) {
            throw api_error_1.ApiError.badRequest('Target nominal tidak boleh kurang dari 0');
        }
        if (input.code && input.code !== existing.code) {
            const codeDup = await database_1.prisma.specialFund.findUnique({
                where: {
                    parokiId_code: {
                        parokiId,
                        code: input.code,
                    },
                },
            });
            if (codeDup) {
                throw api_error_1.ApiError.badRequest(`Kode Dana Khusus "${input.code}" sudah terdaftar`);
            }
        }
        const updated = await database_1.prisma.$transaction(async (tx) => {
            // 1. If code or name changes, check uniqueness in FundCategory as well
            if (input.code && input.code !== existing.code) {
                const catCodeDup = await tx.fundCategory.findUnique({
                    where: {
                        parokiId_code: {
                            parokiId,
                            code: input.code,
                        },
                    },
                });
                if (catCodeDup) {
                    throw api_error_1.ApiError.badRequest(`Kode Pos Dana "${input.code}" sudah terdaftar`);
                }
            }
            if (input.name && input.name !== existing.name) {
                const catNameDup = await tx.fundCategory.findUnique({
                    where: {
                        parokiId_name: {
                            parokiId,
                            name: `Dana Khusus: ${input.name}`,
                        },
                    },
                });
                if (catNameDup) {
                    throw api_error_1.ApiError.badRequest(`Nama Pos Dana "Dana Khusus: ${input.name}" sudah terdaftar`);
                }
            }
            // 2. Update linked FundCategory
            if (existing.fundCategoryId) {
                await tx.fundCategory.update({
                    where: { id: existing.fundCategoryId },
                    data: {
                        ...(input.code ? { code: input.code } : {}),
                        ...(input.name ? { name: `Dana Khusus: ${input.name}` } : {}),
                        ...(input.description ? { description: input.description } : {}),
                    },
                });
            }
            // 3. Update SpecialFund
            const fund = await tx.specialFund.update({
                where: { id },
                data: {
                    code: input.code,
                    name: input.name,
                    description: input.description,
                    tujuanPenggalangan: input.tujuanPenggalangan,
                    targetNominal: input.targetNominal,
                    tanggalMulai: input.tanggalMulai,
                    tanggalSelesai: input.tanggalSelesai,
                },
            });
            return fund;
        });
        await database_1.prisma.auditLog.create({
            data: {
                type: 'SPECIAL_FUND',
                action: `Mengubah rincian Dana Khusus: ${updated.name}`,
                actorId: userId,
                parokiId,
                oldData: JSON.parse(JSON.stringify(existing)),
                newData: JSON.parse(JSON.stringify(updated)),
            },
        });
        return updated;
    }
    /**
     * Delete Special Fund
     */
    static async deleteSpecialFund(parokiId, id, userId) {
        const existing = await database_1.prisma.specialFund.findUnique({
            where: { id },
        });
        if (!existing) {
            throw api_error_1.ApiError.notFound('Dana Khusus tidak ditemukan');
        }
        if (existing.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
        }
        if (existing.status !== client_1.SpecialFundStatus.DRAFT) {
            throw api_error_1.ApiError.badRequest('Hanya Dana Khusus berstatus DRAFT yang dapat dihapus');
        }
        // Check if any transactions have linked to it (just in case)
        const txCount = await database_1.prisma.cashTransaction.count({
            where: { specialFundId: id },
        });
        if (txCount > 0) {
            throw api_error_1.ApiError.badRequest('Tidak dapat menghapus Dana Khusus yang memiliki histori transaksi');
        }
        await database_1.prisma.$transaction(async (tx) => {
            // 1. Delete SpecialFund
            await tx.specialFund.delete({
                where: { id },
            });
            // 2. Delete linked FundCategory
            if (existing.fundCategoryId) {
                await tx.fundCategory.delete({
                    where: { id: existing.fundCategoryId },
                });
            }
        });
        await database_1.prisma.auditLog.create({
            data: {
                type: 'SPECIAL_FUND',
                action: `Menghapus Dana Khusus: ${existing.name} (${existing.code})`,
                actorId: userId,
                parokiId,
                oldData: JSON.parse(JSON.stringify(existing)),
            },
        });
    }
    /**
     * Activate Special Fund
     */
    static async activateSpecialFund(parokiId, id, userId) {
        const existing = await database_1.prisma.specialFund.findUnique({
            where: { id },
        });
        if (!existing) {
            throw api_error_1.ApiError.notFound('Dana Khusus tidak ditemukan');
        }
        if (existing.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
        }
        if (existing.status !== client_1.SpecialFundStatus.DRAFT) {
            throw api_error_1.ApiError.badRequest('Hanya Dana Khusus berstatus DRAFT yang dapat diaktifkan');
        }
        const updated = await database_1.prisma.specialFund.update({
            where: { id },
            data: { status: client_1.SpecialFundStatus.AKTIF },
        });
        await database_1.prisma.auditLog.create({
            data: {
                type: 'SPECIAL_FUND',
                action: `Mengaktifkan Dana Khusus: ${updated.name}`,
                actorId: userId,
                parokiId,
                oldData: JSON.parse(JSON.stringify(existing)),
                newData: JSON.parse(JSON.stringify(updated)),
            },
        });
        return updated;
    }
    /**
     * Close Special Fund
     */
    static async closeSpecialFund(parokiId, id, userId) {
        const existing = await database_1.prisma.specialFund.findUnique({
            where: { id },
        });
        if (!existing) {
            throw api_error_1.ApiError.notFound('Dana Khusus tidak ditemukan');
        }
        if (existing.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
        }
        if (existing.status !== client_1.SpecialFundStatus.AKTIF) {
            throw api_error_1.ApiError.badRequest('Hanya Dana Khusus berstatus AKTIF yang dapat ditutup');
        }
        const updated = await database_1.prisma.specialFund.update({
            where: { id },
            data: { status: client_1.SpecialFundStatus.DITUTUP },
        });
        await database_1.prisma.auditLog.create({
            data: {
                type: 'SPECIAL_FUND',
                action: `Menutup Dana Khusus secara manual: ${updated.name}`,
                actorId: userId,
                parokiId,
                oldData: JSON.parse(JSON.stringify(existing)),
                newData: JSON.parse(JSON.stringify(updated)),
            },
        });
        return updated;
    }
    /**
     * Allocate remaining balance to a permanent Pos Dana (FundCategory)
     */
    static async allocateRemainingBalance(parokiId, id, userId, input) {
        const specialFund = await database_1.prisma.specialFund.findUnique({
            where: { id },
        });
        if (!specialFund) {
            throw api_error_1.ApiError.notFound('Dana Khusus tidak ditemukan');
        }
        if (specialFund.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
        }
        if (specialFund.status !== client_1.SpecialFundStatus.DITUTUP) {
            throw api_error_1.ApiError.badRequest('Alokasi sisa dana hanya dapat dilakukan setelah Dana Khusus DITUTUP');
        }
        const balanceNum = Number(specialFund.balance);
        if (balanceNum < input.nominal) {
            throw api_error_1.ApiError.badRequest(`Nominal alokasi (${input.nominal}) tidak boleh melebihi sisa saldo Dana Khusus (${balanceNum})`);
        }
        const targetPos = await database_1.prisma.fundCategory.findUnique({
            where: { id: input.targetPosDanaId },
        });
        if (!targetPos) {
            throw api_error_1.ApiError.notFound('Pos Dana tujuan tidak ditemukan');
        }
        if (targetPos.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Pos Dana tujuan berada di luar paroki Anda');
        }
        // Run within a Prisma transaction
        const result = await database_1.prisma.$transaction(async (tx) => {
            // 1. Decrement balance of SpecialFund
            const updatedFund = await tx.specialFund.update({
                where: { id },
                data: {
                    balance: { decrement: input.nominal },
                    expense: { increment: input.nominal },
                },
            });
            // 2. Create SpecialFundAllocation log
            const allocation = await tx.specialFundAllocation.create({
                data: {
                    specialFundId: id,
                    targetPosDanaId: input.targetPosDanaId,
                    nominal: input.nominal,
                    keterangan: input.keterangan || `Alokasi sisa saldo Dana Khusus: ${specialFund.name}`,
                    createdById: userId,
                },
            });
            // 3. Create Income CashTransaction for target Pos Dana to dynamically reflect balance increase
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);
            const countToday = await tx.cashTransaction.count({
                where: {
                    parokiId,
                    transactionType: 'INCOME',
                    createdAt: { gte: todayStart, lt: tomorrowStart },
                },
            });
            const yyyymmdd = todayStart.toISOString().slice(0, 10).replace(/-/g, '');
            const seqIn = String(countToday + 1).padStart(4, '0');
            const transactionNoIn = `TX-IN-ALOK-${yyyymmdd}-${seqIn}`;
            // Find an IncomeType for general transfers/allocation, or just use the first available active IncomeType
            const firstIncomeType = await tx.incomeType.findFirst({
                where: { parokiId, isActive: true },
            });
            if (!firstIncomeType) {
                throw api_error_1.ApiError.badRequest('Tipe pendapatan aktif tidak ditemukan. Harap buat tipe pendapatan terlebih dahulu.');
            }
            const incomingTx = await tx.cashTransaction.create({
                data: {
                    transactionNo: transactionNoIn,
                    transactionDate: new Date(),
                    transactionType: 'INCOME',
                    fundCategoryId: input.targetPosDanaId,
                    incomeTypeId: firstIncomeType.id,
                    amount: input.nominal,
                    description: `Alokasi sisa saldo dari Dana Khusus: ${specialFund.name}. Keterangan: ${input.keterangan || ''}`,
                    createdById: userId,
                    parokiId,
                },
            });
            // 4. Create Expense CashTransaction for Special Fund to trace the outflow
            const firstExpenseType = await tx.expenseType.findFirst({
                where: { parokiId, isActive: true },
            });
            if (!firstExpenseType) {
                throw api_error_1.ApiError.badRequest('Tipe pengeluaran aktif tidak ditemukan. Harap buat tipe pengeluaran terlebih dahulu.');
            }
            const seqOut = String(countToday + 2).padStart(4, '0');
            const transactionNoOut = `TX-OUT-ALOK-${yyyymmdd}-${seqOut}`;
            const outgoingTx = await tx.cashTransaction.create({
                data: {
                    transactionNo: transactionNoOut,
                    transactionDate: new Date(),
                    transactionType: 'EXPENSE',
                    fundCategoryId: incomingTx.fundCategoryId, // link to dummy or same pos
                    expenseTypeId: firstExpenseType.id,
                    specialFundId: id,
                    amount: input.nominal,
                    description: `Pengalokasian sisa saldo ke Pos Dana ${targetPos.name}. Keterangan: ${input.keterangan || ''}`,
                    createdById: userId,
                    parokiId,
                },
            });
            // 5. Write Audit Log
            await tx.auditLog.create({
                data: {
                    type: 'SPECIAL_FUND',
                    action: `Alokasi Sisa Saldo Dana Khusus: ${specialFund.name} sebesar ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(input.nominal)} dialokasikan ke Pos Dana ${targetPos.name}`,
                    amount: input.nominal,
                    actorId: userId,
                    parokiId,
                    oldData: JSON.parse(JSON.stringify(specialFund)),
                    newData: JSON.parse(JSON.stringify(updatedFund)),
                },
            });
            return { updatedFund, allocation, incomingTx, outgoingTx };
        });
        return result;
    }
    /**
     * Get transactions related to Special Fund
     */
    static async getSpecialFundTransactions(parokiId, id) {
        // Verify paroki scope
        const fund = await database_1.prisma.specialFund.findUnique({
            where: { id },
        });
        if (!fund) {
            throw api_error_1.ApiError.notFound('Dana Khusus tidak ditemukan');
        }
        if (fund.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
        }
        return await database_1.prisma.cashTransaction.findMany({
            where: { specialFundId: id },
            include: {
                incomeType: true,
                expenseType: true,
                createdBy: {
                    select: { id: true, name: true },
                },
            },
            orderBy: { transactionDate: 'desc' },
        });
    }
    /**
     * Get Report summary for Special Fund
     */
    static async getSpecialFundReport(parokiId, id) {
        const fund = await database_1.prisma.specialFund.findUnique({
            where: { id },
            include: {
                allocations: {
                    include: {
                        targetPosDana: true,
                    },
                },
            },
        });
        if (!fund) {
            throw api_error_1.ApiError.notFound('Dana Khusus tidak ditemukan');
        }
        if (fund.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
        }
        const transactions = await database_1.prisma.cashTransaction.findMany({
            where: { specialFundId: id },
            orderBy: { transactionDate: 'asc' },
        });
        const incomeTx = transactions.filter((t) => t.transactionType === 'INCOME');
        const expenseTx = transactions.filter((t) => t.transactionType === 'EXPENSE');
        const totalIncome = incomeTx.reduce((sum, t) => sum + Number(t.amount), 0);
        const totalExpense = expenseTx.reduce((sum, t) => sum + Number(t.amount), 0);
        return {
            fundDetails: {
                id: fund.id,
                code: fund.code,
                name: fund.name,
                status: fund.status,
                target: Number(fund.targetNominal || 0),
                balance: Number(fund.balance),
                totalIncome,
                totalExpense,
                tanggalMulai: fund.tanggalMulai,
                tanggalSelesai: fund.tanggalSelesai,
            },
            transactions: transactions.map((t) => ({
                id: t.id,
                no: t.transactionNo,
                tanggal: t.transactionDate,
                tipe: t.transactionType,
                jumlah: Number(t.amount),
                keterangan: t.description,
            })),
            allocations: fund.allocations.map((a) => ({
                id: a.id,
                tanggal: a.tanggal,
                nominal: Number(a.nominal),
                targetPos: a.targetPosDana.name,
                keterangan: a.keterangan,
            })),
        };
    }
}
exports.SpecialFundService = SpecialFundService;
