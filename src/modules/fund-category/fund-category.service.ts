import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/api-error';

export class FundCategoryService {
  /**
   * Get all fund categories scoped to Paroki
   */
  static async getFundCategories(parokiId: string) {
    return await prisma.fundCategory.findMany({
      where: { parokiId },
      orderBy: { code: 'asc' },
    });
  }

  /**
   * Create new fund category
   */
  static async createFundCategory(
    parokiId: string,
    input: {
      code: string;
      name: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    // Check code duplication in paroki
    const existingCode = await prisma.fundCategory.findUnique({
      where: {
        parokiId_code: {
          parokiId,
          code: input.code,
        },
      },
    });

    if (existingCode) {
      throw ApiError.badRequest(`Kode Pos Dana "${input.code}" sudah terdaftar`);
    }

    // Check name duplication in paroki
    const existingName = await prisma.fundCategory.findUnique({
      where: {
        parokiId_name: {
          parokiId,
          name: input.name,
        },
      },
    });

    if (existingName) {
      throw ApiError.badRequest(`Nama Pos Dana "${input.name}" sudah terdaftar`);
    }

    return await prisma.fundCategory.create({
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
  static async updateFundCategory(
    parokiId: string,
    id: string,
    input: {
      code?: string;
      name?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.fundCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Pos Dana tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Pos Dana berada di luar paroki Anda');
    }

    // Unique checks if changed
    if (input.code && input.code !== existing.code) {
      const codeDup = await prisma.fundCategory.findUnique({
        where: {
          parokiId_code: {
            parokiId,
            code: input.code,
          },
        },
      });
      if (codeDup) {
        throw ApiError.badRequest(`Kode Pos Dana "${input.code}" sudah terdaftar`);
      }
    }

    if (input.name && input.name !== existing.name) {
      const nameDup = await prisma.fundCategory.findUnique({
        where: {
          parokiId_name: {
            parokiId,
            name: input.name,
          },
        },
      });
      if (nameDup) {
        throw ApiError.badRequest(`Nama Pos Dana "${input.name}" sudah terdaftar`);
      }
    }

    return await prisma.fundCategory.update({
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
  static async deleteFundCategory(parokiId: string, id: string) {
    const existing = await prisma.fundCategory.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Pos Dana tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Pos Dana berada di luar paroki Anda');
    }

    // Check if any transactions reference it
    const transCount = await prisma.cashTransaction.count({
      where: { fundCategoryId: id },
    });

    if (transCount > 0) {
      throw ApiError.badRequest('Tidak dapat menghapus Pos Dana yang sudah memiliki transaksi terkait');
    }

    return await prisma.fundCategory.delete({
      where: { id },
    });
  }

  /**
   * Get dynamic balances for all fund categories computed from transactions
   */
  static async getFundBalances(parokiId: string) {
    const funds = await prisma.fundCategory.findMany({
      where: { parokiId },
      orderBy: { name: 'asc' },
    });

    const incomes = await prisma.cashTransaction.groupBy({
      by: ['fundCategoryId'],
      where: {
        parokiId,
        transactionType: 'INCOME',
      },
      _sum: {
        amount: true,
      },
    });

    const expenses = await prisma.cashTransaction.groupBy({
      by: ['fundCategoryId'],
      where: {
        parokiId,
        transactionType: 'EXPENSE',
      },
      _sum: {
        amount: true,
      },
    });

    const incomeMap = new Map<string, number>();
    incomes.forEach((i) => {
      incomeMap.set(i.fundCategoryId, Number(i._sum.amount || 0));
    });

    const expenseMap = new Map<string, number>();
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

  /**
   * Transfer balance from one Pos Dana to another Pos Dana
   */
  static async transferBalance(
    parokiId: string,
    userId: string,
    input: {
      sourceFundCategoryId: string;
      targetFundCategoryId: string;
      amount: number;
      description: string;
    }
  ) {
    if (input.sourceFundCategoryId === input.targetFundCategoryId) {
      throw ApiError.badRequest('Pos Dana asal dan tujuan tidak boleh sama');
    }

    if (input.amount <= 0) {
      throw ApiError.badRequest('Nominal transfer harus lebih dari 0');
    }

    // Verify Source Fund Category
    const sourceFund = await prisma.fundCategory.findUnique({
      where: { id: input.sourceFundCategoryId },
      include: { specialFund: true },
    });
    if (!sourceFund) {
      throw ApiError.notFound('Pos Dana asal tidak ditemukan');
    }
    if (sourceFund.parokiId !== parokiId) {
      throw ApiError.forbidden('Pos Dana asal berada di luar paroki Anda');
    }
    if (!sourceFund.isActive) {
      throw ApiError.badRequest('Pos Dana asal tidak aktif');
    }
    if (sourceFund.specialFund) {
      throw ApiError.badRequest('Tidak dapat mentransfer saldo langsung dari Pos Dana khusus. Gunakan modul alokasi sisa dana khusus.');
    }

    // Verify Target Fund Category
    const targetFund = await prisma.fundCategory.findUnique({
      where: { id: input.targetFundCategoryId },
      include: { specialFund: true },
    });
    if (!targetFund) {
      throw ApiError.notFound('Pos Dana tujuan tidak ditemukan');
    }
    if (targetFund.parokiId !== parokiId) {
      throw ApiError.forbidden('Pos Dana tujuan berada di luar paroki Anda');
    }
    if (!targetFund.isActive) {
      throw ApiError.badRequest('Pos Dana tujuan tidak aktif');
    }
    if (targetFund.specialFund) {
      throw ApiError.badRequest('Tidak dapat mentransfer saldo langsung ke Pos Dana khusus.');
    }

    // Calculate current balance of Source Fund Category
    const incomes = await prisma.cashTransaction.aggregate({
      where: {
        parokiId,
        fundCategoryId: input.sourceFundCategoryId,
        transactionType: 'INCOME',
      },
      _sum: { amount: true },
    });

    const expenses = await prisma.cashTransaction.aggregate({
      where: {
        parokiId,
        fundCategoryId: input.sourceFundCategoryId,
        transactionType: 'EXPENSE',
      },
      _sum: { amount: true },
    });

    const currentBalance = Number(incomes._sum.amount || 0) - Number(expenses._sum.amount || 0);
    if (currentBalance < input.amount) {
      throw ApiError.badRequest(
        `Saldo ${sourceFund.name} tidak mencukupi. Saldo tersedia: Rp ${currentBalance.toLocaleString('id-ID')}, Jumlah transfer: Rp ${input.amount.toLocaleString('id-ID')}`
      );
    }

    // Find the default income type and expense type for transfer
    const firstIncomeType = await prisma.incomeType.findFirst({
      where: { parokiId, isActive: true },
    });
    if (!firstIncomeType) {
      throw ApiError.badRequest('Tipe Pendapatan aktif tidak ditemukan. Harap buat tipe pendapatan terlebih dahulu.');
    }

    const firstExpenseType = await prisma.expenseType.findFirst({
      where: { parokiId, isActive: true },
    });
    if (!firstExpenseType) {
      throw ApiError.badRequest('Tipe Pengeluaran aktif tidak ditemukan. Harap buat tipe pengeluaran terlebih dahulu.');
    }

    const result = await prisma.$transaction(async (tx) => {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const tomorrowStart = new Date(todayStart);
      tomorrowStart.setDate(tomorrowStart.getDate() + 1);

      // Create Expense on Source
      const countExpense = await tx.cashTransaction.count({
        where: {
          parokiId,
          transactionType: 'EXPENSE',
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
      });

      const yyyymmdd = todayStart.toISOString().slice(0, 10).replace(/-/g, '');
      const seqOut = String(countExpense + 1).padStart(4, '0');
      const transactionNoOut = `TX-OUT-TRSF-${yyyymmdd}-${seqOut}`;

      const outgoingTx = await tx.cashTransaction.create({
        data: {
          transactionNo: transactionNoOut,
          transactionDate: new Date(),
          transactionType: 'EXPENSE',
          fundCategoryId: input.sourceFundCategoryId,
          expenseTypeId: firstExpenseType.id,
          amount: input.amount,
          description: `Transfer saldo ke ${targetFund.name}. Rincian: ${input.description}`,
          createdById: userId,
          parokiId,
        },
      });

      // Create Income on Target
      const countIncome = await tx.cashTransaction.count({
        where: {
          parokiId,
          transactionType: 'INCOME',
          createdAt: { gte: todayStart, lt: tomorrowStart },
        },
      });
      const seqIn = String(countIncome + 1).padStart(4, '0');
      const transactionNoIn = `TX-IN-TRSF-${yyyymmdd}-${seqIn}`;

      const incomingTx = await tx.cashTransaction.create({
        data: {
          transactionNo: transactionNoIn,
          transactionDate: new Date(),
          transactionType: 'INCOME',
          fundCategoryId: input.targetFundCategoryId,
          incomeTypeId: firstIncomeType.id,
          amount: input.amount,
          description: `Menerima transfer saldo dari ${sourceFund.name}. Rincian: ${input.description}`,
          createdById: userId,
          parokiId,
          parentTransactionId: outgoingTx.id,
        },
      });

      // Record Audit Log
      const formattedAmount = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        minimumFractionDigits: 0,
      }).format(input.amount);

      await tx.auditLog.create({
        data: {
          type: 'TRANSFER',
          action: `Transfer saldo dari ${sourceFund.name} ke ${targetFund.name} senilai ${formattedAmount}. Keterangan: ${input.description}`,
          amount: input.amount,
          actorId: userId,
          parokiId,
        },
      });

      return { outgoingTx, incomingTx };
    });

    return result;
  }
}
