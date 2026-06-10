import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/api-error';

export class CashTransactionService {
  /**
   * Get all income transactions scoped to Paroki with filters
   */
  static async getIncomes(
    parokiId: string,
    filters: {
      fund_category_id?: string;
      income_type_id?: string;
      start_date?: Date;
      end_date?: Date;
      search?: string;
    }
  ) {
    const whereClause: any = {
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

    return await prisma.cashTransaction.findMany({
      where: whereClause,
      include: {
        fundCategory: true,
        incomeType: true,
        attachment: true,
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  /**
   * Get all expense transactions scoped to Paroki with filters
   */
  static async getExpenses(
    parokiId: string,
    filters: {
      fund_category_id?: string;
      expense_type_id?: string;
      start_date?: Date;
      end_date?: Date;
      search?: string;
    }
  ) {
    const whereClause: any = {
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

    return await prisma.cashTransaction.findMany({
      where: whereClause,
      include: {
        fundCategory: true,
        expenseType: true,
        attachment: true,
      },
      orderBy: { transactionDate: 'desc' },
    });
  }

  /**
   * Get dynamic balance for a single fund category
   */
  static async getFundCategoryBalance(parokiId: string, fundCategoryId: string): Promise<number> {
    const incomes = await prisma.cashTransaction.aggregate({
      where: {
        parokiId,
        fundCategoryId,
        transactionType: 'INCOME',
      },
      _sum: { amount: true },
    });

    const expenses = await prisma.cashTransaction.aggregate({
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
  static async createIncome(
    parokiId: string,
    userId: string,
    input: {
      transaction_date: Date;
      fund_category_id: string;
      income_type_id: string;
      amount: number;
      description: string;
    }
  ) {
    // 1. Verify Pos Dana
    const fund = await prisma.fundCategory.findUnique({
      where: { id: input.fund_category_id },
    });
    if (!fund) {
      throw ApiError.notFound('Pos Dana tidak ditemukan');
    }
    if (fund.parokiId !== parokiId) {
      throw ApiError.forbidden('Pos Dana berada di luar paroki Anda');
    }
    if (!fund.isActive) {
      throw ApiError.badRequest('Pos Dana tidak aktif');
    }

    // 2. Verify Income Type
    const incType = await prisma.incomeType.findUnique({
      where: { id: input.income_type_id },
    });
    if (!incType) {
      throw ApiError.notFound('Jenis Penerimaan tidak ditemukan');
    }
    if (incType.parokiId !== parokiId) {
      throw ApiError.forbidden('Jenis Penerimaan berada di luar paroki Anda');
    }
    if (!incType.isActive) {
      throw ApiError.badRequest('Jenis Penerimaan tidak aktif');
    }

    // 3. Create Transaction in DB with auto transactionNo
    return await prisma.$transaction(async (tx) => {
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

      const newTx = await tx.cashTransaction.create({
        data: {
          transactionNo,
          transactionDate: input.transaction_date,
          transactionType: 'INCOME',
          fundCategoryId: input.fund_category_id,
          incomeTypeId: input.income_type_id,
          amount: input.amount,
          description: input.description,
          createdById: userId,
          parokiId,
        },
        include: {
          fundCategory: true,
          incomeType: true,
        },
      });

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
        },
      });

      return newTx;
    });
  }

  /**
   * Create cash expense (checking limits, handles upload)
   */
  static async createExpense(
    parokiId: string,
    userId: string,
    input: {
      transaction_date: Date;
      fund_category_id: string;
      expense_type_id: string;
      amount: number;
      description: string;
    },
    file?: Express.Multer.File
  ) {
    // 1. Verify Pos Dana
    const fund = await prisma.fundCategory.findUnique({
      where: { id: input.fund_category_id },
    });
    if (!fund) {
      throw ApiError.notFound('Pos Dana tidak ditemukan');
    }
    if (fund.parokiId !== parokiId) {
      throw ApiError.forbidden('Pos Dana berada di luar paroki Anda');
    }
    if (!fund.isActive) {
      throw ApiError.badRequest('Pos Dana tidak aktif');
    }

    // 2. Verify Expense Type
    const expType = await prisma.expenseType.findUnique({
      where: { id: input.expense_type_id },
    });
    if (!expType) {
      throw ApiError.notFound('Jenis Pengeluaran tidak ditemukan');
    }
    if (expType.parokiId !== parokiId) {
      throw ApiError.forbidden('Jenis Pengeluaran berada di luar paroki Anda');
    }
    if (!expType.isActive) {
      throw ApiError.badRequest('Jenis Pengeluaran tidak aktif');
    }

    // 3. Check Balance limits
    const balance = await this.getFundCategoryBalance(parokiId, input.fund_category_id);
    if (input.amount > balance) {
      throw ApiError.badRequest(
        `${fund.name} tidak mencukupi. Saldo tersedia Rp ${balance.toLocaleString('id-ID')} sedangkan pengeluaran Rp ${input.amount.toLocaleString('id-ID')}.`
      );
    }

    // 4. Create Transaction
    return await prisma.$transaction(async (tx) => {
      // Re-verify balance inside transaction lock to avoid race conditions
      const currentIncomes = await tx.cashTransaction.aggregate({
        where: { parokiId, fundCategoryId: input.fund_category_id, transactionType: 'INCOME' },
        _sum: { amount: true },
      });
      const currentExpenses = await tx.cashTransaction.aggregate({
        where: { parokiId, fundCategoryId: input.fund_category_id, transactionType: 'EXPENSE' },
        _sum: { amount: true },
      });
      const txBalance = Number(currentIncomes._sum.amount || 0) - Number(currentExpenses._sum.amount || 0);

      if (input.amount > txBalance) {
        throw ApiError.badRequest(
          `${fund.name} tidak mencukupi. Saldo tersedia Rp ${txBalance.toLocaleString('id-ID')} sedangkan pengeluaran Rp ${input.amount.toLocaleString('id-ID')}.`
        );
      }

      // Handle file upload
      let attachmentId: string | undefined = undefined;
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

      const newTx = await tx.cashTransaction.create({
        data: {
          transactionNo,
          transactionDate: input.transaction_date,
          transactionType: 'EXPENSE',
          fundCategoryId: input.fund_category_id,
          expenseTypeId: input.expense_type_id,
          amount: input.amount,
          description: input.description,
          attachmentId: attachmentId || null,
          createdById: userId,
          parokiId,
        },
        include: {
          fundCategory: true,
          expenseType: true,
          attachment: true,
        },
      });

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
        },
      });

      return newTx;
    });
  }

  /**
   * Get single transaction by ID
   */
  static async getTransactionById(parokiId: string, id: string, type: 'INCOME' | 'EXPENSE') {
    const transaction = await prisma.cashTransaction.findFirst({
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
      },
    });

    if (!transaction) {
      throw ApiError.notFound('Transaksi kas tidak ditemukan');
    }

    return transaction;
  }
}
