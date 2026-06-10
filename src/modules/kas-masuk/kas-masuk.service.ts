import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/api-error';

export class KasMasukService {
  /**
   * Get list of Kas Masuk records scoped to Paroki with filters
   */
  static async getKasMasuk(
    parokiId: string,
    filters: {
      search?: string;
      kategori?: string;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    const whereClause: any = {
      parokiId,
    };

    if (filters.kategori) {
      whereClause.kategori = filters.kategori;
    }

    if (filters.startDate || filters.endDate) {
      whereClause.tanggal = {};
      if (filters.startDate) {
        whereClause.tanggal.gte = filters.startDate;
      }
      if (filters.endDate) {
        whereClause.tanggal.lte = filters.endDate;
      }
    }

    if (filters.search) {
      whereClause.OR = [
        { sumber: { contains: filters.search, mode: 'insensitive' } },
        { keterangan: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return await prisma.kasMasuk.findMany({
      where: whereClause,
      orderBy: [
        { tanggal: 'desc' },
        { createdAt: 'desc' },
      ],
    });
  }

  /**
   * Create a new Kas Masuk record
   */
  static async createKasMasuk(
    parokiId: string,
    actorId: string,
    input: {
      tanggal: Date;
      kategori: 'Kolekte' | 'Donasi' | 'Persembahan' | 'Pembangunan' | 'Lainnya';
      sumber: string;
      jumlah: number;
      keterangan?: string;
      status?: string;
    }
  ) {
    // 1. Create transaction in DB
    const newTransaction = await prisma.kasMasuk.create({
      data: {
        tanggal: input.tanggal,
        kategori: input.kategori,
        sumber: input.sumber,
        jumlah: input.jumlah,
        keterangan: input.keterangan,
        status: input.status || 'Selesai',
        parokiId,
      },
    });

    // 2. Create Audit Log entry
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(input.jumlah);

    await prisma.auditLog.create({
      data: {
        type: 'IN',
        action: `Mencatat Kas Masuk kategori ${input.kategori} dari ${input.sumber} senilai ${formattedAmount}`,
        amount: input.jumlah,
        actorId,
        parokiId,
      },
    });

    return newTransaction;
  }

  /**
   * Update an existing Kas Masuk record
   */
  static async updateKasMasuk(
    parokiId: string,
    actorId: string,
    id: string,
    input: {
      tanggal?: Date;
      kategori?: 'Kolekte' | 'Donasi' | 'Persembahan' | 'Pembangunan' | 'Lainnya';
      sumber?: string;
      jumlah?: number;
      keterangan?: string;
      status?: string;
    }
  ) {
    // 1. Check existence and ownership boundary
    const existing = await prisma.kasMasuk.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Transaksi Kas Masuk tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Anda tidak memiliki akses untuk mengubah transaksi ini');
    }

    // 2. Update in DB
    const updated = await prisma.kasMasuk.update({
      where: { id },
      data: input,
    });

    // 3. Write Audit Log
    const amountToLog = input.jumlah !== undefined ? input.jumlah : Number(existing.jumlah);
    const sourceToLog = input.sumber || existing.sumber;
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amountToLog);

    await prisma.auditLog.create({
      data: {
        type: 'IN',
        action: `Memperbarui transaksi Kas Masuk: ${sourceToLog} senilai ${formattedAmount}`,
        amount: amountToLog,
        actorId,
        parokiId,
      },
    });

    return updated;
  }

  /**
   * Delete an existing Kas Masuk record
   */
  static async deleteKasMasuk(parokiId: string, actorId: string, id: string) {
    // 1. Check existence and ownership boundary
    const existing = await prisma.kasMasuk.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Transaksi Kas Masuk tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Anda tidak memiliki akses untuk menghapus transaksi ini');
    }

    // 2. Delete transaction from DB
    await prisma.kasMasuk.delete({
      where: { id },
    });

    // 3. Write Audit Log
    const formattedAmount = new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(Number(existing.jumlah));

    await prisma.auditLog.create({
      data: {
        type: 'IN',
        action: `Menghapus transaksi Kas Masuk: ${existing.sumber} yang bernilai ${formattedAmount}`,
        amount: existing.jumlah,
        actorId,
        parokiId,
      },
    });

    return existing;
  }
}
