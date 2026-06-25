"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashTransactionService = void 0;
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
class CashTransactionService {
    /**
     * Get all income transactions scoped to Paroki with filters
     */
    static async getIncomes(parokiId, filters) {
        const whereClause = {
            parokiId,
            transactionType: 'INCOME',
        };
        if (filters.fund_category_id) {
            whereClause.fundCategoryId = filters.fund_category_id;
        }
        if (filters.income_type_id) {
            whereClause.incomeTypeId = filters.income_type_id;
        }
        if (filters.start_date || filters.end_date) {
            whereClause.transactionDate = {};
            if (filters.start_date) {
                whereClause.transactionDate.gte = filters.start_date;
            }
            if (filters.end_date) {
                whereClause.transactionDate.lte = filters.end_date;
            }
        }
        if (filters.search) {
            whereClause.description = { contains: filters.search, mode: 'insensitive' };
        }
        return await database_1.prisma.cashTransaction.findMany({
            where: whereClause,
            include: {
                fundCategory: true,
                incomeType: true,
                attachment: true,
                specialFund: true,
                auditedBy: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
            orderBy: { transactionDate: 'desc' },
        });
    }
    /**
     * Get all expense transactions scoped to Paroki with filters
     */
    static async getExpenses(parokiId, filters) {
        const whereClause = {
            parokiId,
            transactionType: 'EXPENSE',
        };
        if (filters.fund_category_id) {
            whereClause.fundCategoryId = filters.fund_category_id;
        }
        if (filters.expense_type_id) {
            whereClause.expenseTypeId = filters.expense_type_id;
        }
        if (filters.start_date || filters.end_date) {
            whereClause.transactionDate = {};
            if (filters.start_date) {
                whereClause.transactionDate.gte = filters.start_date;
            }
            if (filters.end_date) {
                whereClause.transactionDate.lte = filters.end_date;
            }
        }
        if (filters.search) {
            whereClause.description = { contains: filters.search, mode: 'insensitive' };
        }
        return await database_1.prisma.cashTransaction.findMany({
            where: whereClause,
            include: {
                fundCategory: true,
                expenseType: true,
                attachment: true,
                specialFund: true,
                spj: {
                    include: {
                        lampiran: {
                            include: {
                                attachment: true,
                            },
                        },
                    },
                },
                parentTransaction: true,
                childTransactions: true,
                auditedBy: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
            orderBy: { transactionDate: 'desc' },
        });
    }
    /**
     * Get dynamic balance for a single fund category
     */
    static async getFundCategoryBalance(parokiId, fundCategoryId) {
        const incomes = await database_1.prisma.cashTransaction.aggregate({
            where: {
                parokiId,
                fundCategoryId,
                transactionType: 'INCOME',
            },
            _sum: { amount: true },
        });
        const expenses = await database_1.prisma.cashTransaction.aggregate({
            where: {
                parokiId,
                fundCategoryId,
                transactionType: 'EXPENSE',
            },
            _sum: { amount: true },
        });
        const totalIn = Number(incomes._sum.amount || 0);
        const totalOut = Number(expenses._sum.amount || 0);
        return totalIn - totalOut;
    }
    /**
     * Create cash income
     */
    static async createIncome(parokiId, userId, input) {
        let fundCategoryId = input.fund_category_id;
        // Verify Special Fund if provided
        if (input.special_fund_id) {
            const specialFund = await database_1.prisma.specialFund.findUnique({
                where: { id: input.special_fund_id },
            });
            if (!specialFund) {
                throw api_error_1.ApiError.notFound('Dana Khusus tidak ditemukan');
            }
            if (specialFund.parokiId !== parokiId) {
                throw api_error_1.ApiError.forbidden('Dana Khusus berada di luar paroki Anda');
            }
            if (specialFund.status !== 'AKTIF') {
                throw api_error_1.ApiError.badRequest('Dana Khusus tidak aktif dan tidak menerima donasi baru.');
            }
            const now = new Date();
            if (now < specialFund.tanggalMulai || now > specialFund.tanggalSelesai) {
                throw api_error_1.ApiError.badRequest('Dana Khusus sudah berakhir dan tidak menerima donasi baru.');
            }
            if (specialFund.fundCategoryId) {
                fundCategoryId = specialFund.fundCategoryId;
            }
        }
        // 1. Verify Pos Dana
        const fund = await database_1.prisma.fundCategory.findUnique({
            where: { id: fundCategoryId },
            include: { specialFund: true },
        });
        if (!fund) {
            throw api_error_1.ApiError.notFound('Pos Dana tidak ditemukan');
        }
        if (fund.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Pos Dana berada di luar paroki Anda');
        }
        if (!fund.isActive) {
            throw api_error_1.ApiError.badRequest('Pos Dana tidak aktif');
        }
        // Prevent manual transactions from using dedicated Special Fund Pos Dana
        if (fund.specialFund && fund.specialFund.id !== input.special_fund_id) {
            throw api_error_1.ApiError.badRequest(`Pos Dana "${fund.name}" didekasikan untuk Dana Khusus dan hanya dapat diisi melalui transaksi Dana Khusus yang bersangkutan.`);
        }
        // 2. Verify Income Type
        const incType = await database_1.prisma.incomeType.findUnique({
            where: { id: input.income_type_id },
        });
        if (!incType) {
            throw api_error_1.ApiError.notFound('Jenis Penerimaan tidak ditemukan');
        }
        if (incType.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Jenis Penerimaan berada di luar paroki Anda');
        }
        if (!incType.isActive) {
            throw api_error_1.ApiError.badRequest('Jenis Penerimaan tidak aktif');
        }
        // Verify parent transaction if provided
        if (input.parent_transaction_id) {
            const parentTx = await database_1.prisma.cashTransaction.findUnique({
                where: { id: input.parent_transaction_id },
            });
            if (!parentTx) {
                throw api_error_1.ApiError.notFound('Transaksi induk tidak ditemukan');
            }
            if (parentTx.parokiId !== parokiId) {
                throw api_error_1.ApiError.forbidden('Transaksi induk berada di luar paroki Anda');
            }
            if (parentTx.transactionType !== 'EXPENSE' || !parentTx.isUangMuka) {
                throw api_error_1.ApiError.badRequest('Transaksi induk harus berupa pengeluaran uang muka');
            }
        }
        // 3. Create Transaction in DB with auto transactionNo
        return await database_1.prisma.$transaction(async (tx) => {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);
            const countToday = await tx.cashTransaction.count({
                where: {
                    parokiId,
                    transactionType: 'INCOME',
                    createdAt: {
                        gte: todayStart,
                        lt: tomorrowStart,
                    },
                },
            });
            const yyyymmdd = todayStart.toISOString().slice(0, 10).replace(/-/g, '');
            const seq = String(countToday + 1).padStart(4, '0');
            const transactionNo = `TX-IN-${yyyymmdd}-${seq}`;
            if (input.special_fund_id) {
                await tx.specialFund.update({
                    where: { id: input.special_fund_id },
                    data: {
                        balance: { increment: input.amount },
                        income: { increment: input.amount },
                    },
                });
            }
            const newTx = await tx.cashTransaction.create({
                data: {
                    transactionNo,
                    transactionDate: input.transaction_date,
                    transactionType: 'INCOME',
                    fundCategoryId: fundCategoryId,
                    incomeTypeId: input.income_type_id,
                    amount: input.amount,
                    description: input.description,
                    createdById: userId,
                    parokiId,
                    parentTransactionId: input.parent_transaction_id || null,
                    specialFundId: input.special_fund_id || null,
                },
                include: {
                    fundCategory: true,
                    incomeType: true,
                },
            });
            if (input.parent_transaction_id) {
                await tx.cashTransaction.update({
                    where: { id: input.parent_transaction_id },
                    data: { status: 'SELESAI' },
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
                    type: 'IN',
                    action: `Mencatat Kas Masuk (Pos Dana: ${fund.name}) - Jenis: ${incType.name} senilai ${formattedAmount}`,
                    amount: input.amount,
                    actorId: userId,
                    parokiId,
                    newData: {
                        transactionId: newTx.id,
                        transactionType: 'INCOME',
                    },
                },
            });
            return newTx;
        });
    }
    /**
     * Create cash expense (checking limits, handles upload)
     */
    static async createExpense(parokiId, userId, input, file) {
        let fundCategoryId = input.fund_category_id;
        // Verify Special Fund if provided
        if (input.special_fund_id) {
            const specialFund = await database_1.prisma.specialFund.findUnique({
                where: { id: input.special_fund_id },
            });
            if (!specialFund) {
                throw api_error_1.ApiError.notFound('Dana Khusus tidak ditemukan');
            }
            if (specialFund.parokiId !== parokiId) {
                throw api_error_1.ApiError.forbidden('Dana Khusus berada di luar paroki Anda');
            }
            if (specialFund.status !== 'AKTIF') {
                throw api_error_1.ApiError.badRequest('Dana Khusus tidak aktif.');
            }
            if (specialFund.fundCategoryId) {
                fundCategoryId = specialFund.fundCategoryId;
            }
            if (Number(specialFund.balance) < input.amount) {
                throw api_error_1.ApiError.badRequest(`Saldo Dana Khusus "${specialFund.name}" tidak mencukupi. Saldo tersedia: Rp ${Number(specialFund.balance).toLocaleString('id-ID')}, Dibutuhkan: Rp ${input.amount.toLocaleString('id-ID')}.`);
            }
        }
        // 1. Verify Pos Dana
        const fund = await database_1.prisma.fundCategory.findUnique({
            where: { id: fundCategoryId },
            include: { specialFund: true },
        });
        if (!fund) {
            throw api_error_1.ApiError.notFound('Pos Dana tidak ditemukan');
        }
        if (fund.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Pos Dana berada di luar paroki Anda');
        }
        if (!fund.isActive) {
            throw api_error_1.ApiError.badRequest('Pos Dana tidak aktif');
        }
        // Prevent manual transactions from using dedicated Special Fund Pos Dana
        if (fund.specialFund && fund.specialFund.id !== input.special_fund_id) {
            throw api_error_1.ApiError.badRequest(`Pos Dana "${fund.name}" didekasikan untuk Dana Khusus dan hanya dapat digunakan melalui transaksi Dana Khusus yang bersangkutan.`);
        }
        // 2. Verify Expense Type
        const expType = await database_1.prisma.expenseType.findUnique({
            where: { id: input.expense_type_id },
        });
        if (!expType) {
            throw api_error_1.ApiError.notFound('Jenis Pengeluaran tidak ditemukan');
        }
        if (expType.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('Jenis Pengeluaran berada di luar paroki Anda');
        }
        if (!expType.isActive) {
            throw api_error_1.ApiError.badRequest('Jenis Pengeluaran tidak aktif');
        }
        // 3. Verify Budget Item and its dynamic limit if budget_item_id is provided
        // 2b. Verify Permohonan Anggaran if provided
        let permohonanAnggaran = null;
        if (input.permohonan_anggaran_id) {
            permohonanAnggaran = await database_1.prisma.permohonanAnggaran.findUnique({
                where: { id: input.permohonan_anggaran_id },
                include: { kegiatan: { include: { komisi: true } } },
            });
            if (!permohonanAnggaran) {
                throw api_error_1.ApiError.notFound('Permohonan Anggaran tidak ditemukan');
            }
            if (permohonanAnggaran.kegiatan.komisi.parokiId !== parokiId) {
                throw api_error_1.ApiError.forbidden('Permohonan Anggaran berada di luar paroki Anda');
            }
            if (permohonanAnggaran.status !== 'DISETUJUI') {
                throw api_error_1.ApiError.badRequest(`Permohonan Anggaran belum disetujui atau sudah diproses. Status: ${permohonanAnggaran.status}`);
            }
            if (input.amount > Number(permohonanAnggaran.jumlahDisetujui)) {
                throw api_error_1.ApiError.badRequest(`Nominal pencairan melebihi nominal anggaran yang disetujui (Disetujui: Rp ${Number(permohonanAnggaran.jumlahDisetujui).toLocaleString('id-ID')})`);
            }
        }
        // 3. Verify Budget Item and its dynamic limit if budget_item_id is provided
        let budgetItem = null;
        if (input.budget_item_id) {
            budgetItem = await database_1.prisma.budgetItem.findUnique({
                where: { id: input.budget_item_id },
                include: { budget: true },
            });
            if (!budgetItem) {
                throw api_error_1.ApiError.notFound('Item Anggaran tidak ditemukan');
            }
            if (budgetItem.budget.parokiId !== parokiId) {
                throw api_error_1.ApiError.forbidden('Item Anggaran berada di luar paroki Anda');
            }
            if (budgetItem.budget.fundCategoryId !== input.fund_category_id) {
                throw api_error_1.ApiError.badRequest('Item Anggaran tidak sesuai dengan Pos Dana transaksi');
            }
            const realAgg = await database_1.prisma.cashTransaction.aggregate({
                where: {
                    budgetItemId: input.budget_item_id,
                    transactionType: 'EXPENSE',
                },
                _sum: { amount: true },
            });
            const currentRealisasi = Number(realAgg._sum.amount || 0);
            const sisa = Number(budgetItem.plafon) - currentRealisasi;
            if (input.amount > sisa) {
                throw api_error_1.ApiError.badRequest(`Sisa plafon anggaran "${budgetItem.name}" tidak mencukupi. Sisa: Rp ${sisa.toLocaleString('id-ID')}, Dibutuhkan: Rp ${input.amount.toLocaleString('id-ID')}`);
            }
        }
        // 4. Check Balance limits
        if (!input.special_fund_id) {
            const balance = await this.getFundCategoryBalance(parokiId, fundCategoryId);
            if (input.amount > balance) {
                throw api_error_1.ApiError.badRequest(`${fund.name} tidak mencukupi. Saldo tersedia Rp ${balance.toLocaleString('id-ID')} sedangkan pengeluaran Rp ${input.amount.toLocaleString('id-ID')}.`);
            }
        }
        // 5. Create Transaction
        return await database_1.prisma.$transaction(async (tx) => {
            if (input.special_fund_id) {
                // Re-verify and decrement Special Fund balance
                const specialFund = await tx.specialFund.findUnique({
                    where: { id: input.special_fund_id },
                });
                if (!specialFund || specialFund.status !== 'AKTIF' || Number(specialFund.balance) < input.amount) {
                    throw api_error_1.ApiError.badRequest('Saldo Dana Khusus tidak mencukupi atau status tidak aktif');
                }
                await tx.specialFund.update({
                    where: { id: input.special_fund_id },
                    data: {
                        balance: { decrement: input.amount },
                        expense: { increment: input.amount },
                    },
                });
            }
            else {
                // Re-verify balance inside transaction lock to avoid race conditions
                const currentIncomes = await tx.cashTransaction.aggregate({
                    where: { parokiId, fundCategoryId: fundCategoryId, transactionType: 'INCOME' },
                    _sum: { amount: true },
                });
                const currentExpenses = await tx.cashTransaction.aggregate({
                    where: { parokiId, fundCategoryId: fundCategoryId, transactionType: 'EXPENSE' },
                    _sum: { amount: true },
                });
                const currentBalance = Number(currentIncomes._sum.amount || 0) - Number(currentExpenses._sum.amount || 0);
                if (input.amount > currentBalance) {
                    throw api_error_1.ApiError.badRequest(`Saldo ${fund.name} tidak mencukupi. Saldo terkini Rp ${currentBalance.toLocaleString('id-ID')} sedangkan pengeluaran Rp ${input.amount.toLocaleString('id-ID')}.`);
                }
            }
            // Re-verify budget item limit inside transaction lock to avoid race conditions
            if (input.budget_item_id && budgetItem) {
                const realAggTx = await tx.cashTransaction.aggregate({
                    where: {
                        budgetItemId: input.budget_item_id,
                        transactionType: 'EXPENSE',
                    },
                    _sum: { amount: true },
                });
                const currentRealisasiTx = Number(realAggTx._sum.amount || 0);
                const sisaTx = Number(budgetItem.plafon) - currentRealisasiTx;
                if (input.amount > sisaTx) {
                    throw api_error_1.ApiError.badRequest(`Sisa plafon anggaran "${budgetItem.name}" tidak mencukupi. Sisa: Rp ${sisaTx.toLocaleString('id-ID')}, Dibutuhkan: Rp ${input.amount.toLocaleString('id-ID')}`);
                }
            }
            // Handle file upload
            let attachmentId = undefined;
            if (file) {
                const isPdf = file.mimetype === 'application/pdf';
                const attachment = await tx.attachment.create({
                    data: {
                        fileName: file.originalname,
                        fileType: isPdf ? 'PDF' : 'IMAGE',
                        fileUrl: `/uploads/${file.filename}`,
                        fileSize: file.size,
                    },
                });
                attachmentId = attachment.id;
            }
            // Generate sequence number
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            const tomorrowStart = new Date(todayStart);
            tomorrowStart.setDate(tomorrowStart.getDate() + 1);
            const countToday = await tx.cashTransaction.count({
                where: {
                    parokiId,
                    transactionType: 'EXPENSE',
                    createdAt: {
                        gte: todayStart,
                        lt: tomorrowStart,
                    },
                },
            });
            const yyyymmdd = todayStart.toISOString().slice(0, 10).replace(/-/g, '');
            const seq = String(countToday + 1).padStart(4, '0');
            const transactionNo = `TX-OUT-${yyyymmdd}-${seq}`;
            const isUangMuka = input.is_uang_muka || false;
            const status = isUangMuka ? 'MENUNGGU_SPJ' : 'SELESAI';
            const newTx = await tx.cashTransaction.create({
                data: {
                    transactionNo,
                    transactionDate: input.transaction_date,
                    transactionType: 'EXPENSE',
                    fundCategoryId: fundCategoryId,
                    expenseTypeId: input.expense_type_id,
                    budgetItemId: input.budget_item_id || null,
                    permohonanAnggaranId: input.permohonan_anggaran_id || null,
                    amount: input.amount,
                    description: input.description,
                    attachmentId: attachmentId || null,
                    createdById: userId,
                    parokiId,
                    isUangMuka,
                    status,
                    specialFundId: input.special_fund_id || null,
                },
                include: {
                    fundCategory: true,
                    expenseType: true,
                    attachment: true,
                    budgetItem: true,
                    spj: true,
                },
            });
            // Update status of PermohonanAnggaran if linked
            if (input.permohonan_anggaran_id) {
                const nextStatus = isUangMuka ? 'DICAIRKAN' : 'SELESAI';
                await tx.permohonanAnggaran.update({
                    where: { id: input.permohonan_anggaran_id },
                    data: { status: nextStatus },
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
                    type: 'OUT',
                    action: `Mencatat Kas Keluar (Pos Dana: ${fund.name}) - Jenis: ${expType.name} senilai ${formattedAmount}`,
                    amount: input.amount,
                    actorId: userId,
                    parokiId,
                    newData: {
                        transactionId: newTx.id,
                        transactionType: 'EXPENSE',
                    },
                },
            });
            return newTx;
        });
    }
    /**
     * Get single transaction by ID
     */
    static async getTransactionById(parokiId, id, type) {
        const transaction = await database_1.prisma.cashTransaction.findFirst({
            where: {
                id,
                parokiId,
                transactionType: type,
            },
            include: {
                fundCategory: true,
                incomeType: true,
                expenseType: true,
                attachment: true,
                spj: {
                    include: {
                        lampiran: {
                            include: {
                                attachment: true,
                            },
                        },
                    },
                },
                parentTransaction: true,
                childTransactions: true,
                auditedBy: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });
        if (!transaction) {
            throw api_error_1.ApiError.notFound('Transaksi kas tidak ditemukan');
        }
        return transaction;
    }
    /**
     * Audit transaction (update status, notes, auditor info)
     */
    static async auditTransaction(parokiId, userId, id, status, notes) {
        // Check if transaction exists
        const transaction = await database_1.prisma.cashTransaction.findFirst({
            where: {
                id,
                parokiId,
            },
        });
        if (!transaction) {
            throw api_error_1.ApiError.notFound('Transaksi kas tidak ditemukan');
        }
        // Update transaction
        const updatedTransaction = await database_1.prisma.cashTransaction.update({
            where: { id },
            data: {
                auditStatus: status,
                auditNotes: notes || null,
                auditedById: userId,
                auditedAt: new Date(),
            },
            include: {
                fundCategory: true,
                incomeType: true,
                expenseType: true,
                attachment: true,
                spj: true,
                auditedBy: {
                    select: {
                        id: true,
                        name: true,
                        role: true,
                    },
                },
            },
        });
        // Format audit status label for logs
        const statusLabel = status === 'TERVERIFIKASI' ? 'TERVERIFIKASI' :
            status === 'PERLU_KLARIFIKASI' ? 'PERLU KLARIFIKASI' : 'TIDAK VALID';
        // Log Audit Trail
        await database_1.prisma.auditLog.create({
            data: {
                type: 'APPROVE', // map to APPROVE log type
                action: `Mengaudit transaksi ${transaction.transactionNo} dengan status: ${statusLabel}${notes ? ` (Catatan: ${notes})` : ''}`,
                amount: Number(transaction.amount || 0),
                actorId: userId,
                parokiId,
                newData: {
                    transactionId: transaction.id,
                    transactionType: transaction.transactionType,
                },
            },
        });
        return updatedTransaction;
    }
}
exports.CashTransactionService = CashTransactionService;
