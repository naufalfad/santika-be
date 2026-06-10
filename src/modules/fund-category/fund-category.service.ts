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
}
