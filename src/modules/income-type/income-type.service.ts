import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/api-error';

export class IncomeTypeService {
  static async getIncomeTypes(parokiId: string) {
    return await prisma.incomeType.findMany({
      where: { parokiId },
      orderBy: { code: 'asc' },
    });
  }

  static async createIncomeType(
    parokiId: string,
    input: {
      code: string;
      name: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    // Check code duplication
    const existingCode = await prisma.incomeType.findUnique({
      where: {
        parokiId_code: {
          parokiId,
          code: input.code,
        },
      },
    });

    if (existingCode) {
      throw ApiError.badRequest(`Kode Jenis Penerimaan "${input.code}" sudah terdaftar`);
    }

    // Check name duplication
    const existingName = await prisma.incomeType.findUnique({
      where: {
        parokiId_name: {
          parokiId,
          name: input.name,
        },
      },
    });

    if (existingName) {
      throw ApiError.badRequest(`Nama Jenis Penerimaan "${input.name}" sudah terdaftar`);
    }

    return await prisma.incomeType.create({
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isActive: input.isActive !== undefined ? input.isActive : true,
        parokiId,
      },
    });
  }

  static async updateIncomeType(
    parokiId: string,
    id: string,
    input: {
      code?: string;
      name?: string;
      description?: string;
      isActive?: boolean;
    }
  ) {
    const existing = await prisma.incomeType.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Jenis Penerimaan tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Jenis Penerimaan berada di luar paroki Anda');
    }

    // Unique checks if changed
    if (input.code && input.code !== existing.code) {
      const codeDup = await prisma.incomeType.findUnique({
        where: {
          parokiId_code: {
            parokiId,
            code: input.code,
          },
        },
      });
      if (codeDup) {
        throw ApiError.badRequest(`Kode Jenis Penerimaan "${input.code}" sudah terdaftar`);
      }
    }

    if (input.name && input.name !== existing.name) {
      const nameDup = await prisma.incomeType.findUnique({
        where: {
          parokiId_name: {
            parokiId,
            name: input.name,
          },
        },
      });
      if (nameDup) {
        throw ApiError.badRequest(`Nama Jenis Penerimaan "${input.name}" sudah terdaftar`);
      }
    }

    return await prisma.incomeType.update({
      where: { id },
      data: {
        code: input.code,
        name: input.name,
        description: input.description,
        isActive: input.isActive,
      },
    });
  }

  static async deleteIncomeType(parokiId: string, id: string) {
    const existing = await prisma.incomeType.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Jenis Penerimaan tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Jenis Penerimaan berada di luar paroki Anda');
    }

    // Check transactions
    const transCount = await prisma.cashTransaction.count({
      where: { incomeTypeId: id },
    });

    if (transCount > 0) {
      throw ApiError.badRequest(
        'Tidak dapat menghapus Jenis Penerimaan yang sudah memiliki transaksi terkait'
      );
    }

    return await prisma.incomeType.delete({
      where: { id },
    });
  }
}
