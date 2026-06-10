import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/api-error';

export class ExpenseTypeService {
  static async getExpenseTypes(parokiId: string) {
    return await prisma.expenseType.findMany({
      where: { parokiId },
      orderBy: { code: 'asc' },
    });
  }

  static async createExpenseType(
    parokiId: string,
    input: {
      code: string;
      name: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    // Check code duplication
    const existingCode = await prisma.expenseType.findUnique({
      where: {
        parokiId_code: {
          parokiId,
          code: input.code,
        },
      },
    });

    if (existingCode) {
      throw ApiError.badRequest(`Kode Jenis Pengeluaran "${input.code}" sudah terdaftar`);
    }

    // Check name duplication
    const existingName = await prisma.expenseType.findUnique({
      where: {
        parokiId_name: {
          parokiId,
          name: input.name,
        },
      },
    });

    if (existingName) {
      throw ApiError.badRequest(`Nama Jenis Pengeluaran "${input.name}" sudah terdaftar`);
    }

    return await prisma.expenseType.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isActive: input.isActive !== undefined ? input.isActive : true,
        parokiId,
      },
    });
  }

  static async updateExpenseType(
    parokiId: string,
    id: string,
    input: {
      code?: string;
      name?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.expenseType.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Jenis Pengeluaran tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Jenis Pengeluaran berada di luar paroki Anda');
    }

    // Unique checks if changed
    if (input.code && input.code !== existing.code) {
      const codeDup = await prisma.expenseType.findUnique({
        where: {
          parokiId_code: {
            parokiId,
            code: input.code,
          },
        },
      });
      if (codeDup) {
        throw ApiError.badRequest(`Kode Jenis Pengeluaran "${input.code}" sudah terdaftar`);
      }
    }

    if (input.name && input.name !== existing.name) {
      const nameDup = await prisma.expenseType.findUnique({
        where: {
          parokiId_name: {
            parokiId,
            name: input.name,
          },
        },
      });
      if (nameDup) {
        throw ApiError.badRequest(`Nama Jenis Pengeluaran "${input.name}" sudah terdaftar`);
      }
    }

    return await prisma.expenseType.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isActive: input.isActive,
      },
    });
  }

  static async deleteExpenseType(parokiId: string, id: string) {
    const existing = await prisma.expenseType.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Jenis Pengeluaran tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Jenis Pengeluaran berada di luar paroki Anda');
    }

    // Check transactions
    const transCount = await prisma.cashTransaction.count({
      where: { expenseTypeId: id },
    });

    if (transCount > 0) {
      throw ApiError.badRequest(
        'Tidak dapat menghapus Jenis Pengeluaran yang sudah memiliki transaksi terkait'
      );
    }

    return await prisma.expenseType.delete({
      where: { id },
    });
  }
}
