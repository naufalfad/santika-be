import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/api-error';
import { SpecialFundStatus } from '@prisma/client';

export class SpecialFundService {
  /**
   * Create a new Special Fund
   */
  static async createSpecialFund(
    parokiId: string,
    userId: string,
    input: {
      code: string;
      name: string;
      description?: string;
      tujuanPenggalangan?: string;
      targetNominal?: number;
      tanggalMulai: Date;
      tanggalSelesai: Date;
    }
  ) {
    if (input.tanggalMulai > input.tanggalSelesai) {
      throw ApiError.badRequest('Tanggal mulai tidak boleh melebihi tanggal selesai');
    }

    if (input.targetNominal !== undefined && input.targetNominal < 0) {
      throw ApiError.badRequest('Target nominal tidak boleh kurang dari 0');
    }

    // Check code uniqueness in Paroki for SpecialFund
    const existing = await prisma.specialFund.findUnique({
      where: {
        parokiId_code: {
          parokiId,
          code: input.code,
        },
      },
    });

    if (existing) {
      throw ApiError.badRequest(`Kode Dana Khusus "${input.code}" sudah terdaftar`);
    }

    // Check code uniqueness in Paroki for FundCategory
    const existingCategoryCode = await prisma.fundCategory.findUnique({
      where: {
        parokiId_code: {
          parokiId,
          code: input.code,
        },
      },
    });
    if (existingCategoryCode) {
      throw ApiError.badRequest(`Kode Pos Dana "${input.code}" sudah terdaftar`);
    }

    const existingCategoryName = await prisma.fundCategory.findUnique({
      where: {
        parokiId_name: {
          parokiId,
          name: `Dana Khusus: ${input.name}`,
        },
      },
    });
    if (existingCategoryName) {
      throw ApiError.badRequest(`Nama Pos Dana "Dana Khusus: ${input.name}" sudah terdaftar`);
    }

    const specialFund = await prisma.$transaction(async (tx) => {
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
          status: SpecialFundStatus.DRAFT,
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
  static async getSpecialFunds(parokiId: string, status?: string) {
    return await prisma.specialFund.findMany({
      where: {
        parokiId,
        ...(status ? { status: status as SpecialFundStatus } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get Special Fund by ID
   */
  static async getSpecialFundById(parokiId: string, id: string) {
    const fund = await prisma.specialFund.findUnique({
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
      throw ApiError.notFound('Dana Khusus tidak ditemukan');
    }

    if (fund.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
    }

    return fund;
  }

  /**
   * Update Special Fund
   */
  static async updateSpecialFund(
    parokiId: string,
    id: string,
    userId: string,
    input: {
      code?: string;
      name?: string;
      description?: string;
      tujuanPenggalangan?: string;
      targetNominal?: number;
      tanggalMulai?: Date;
      tanggalSelesai?: Date;
    }
  ) {
    const existing = await prisma.specialFund.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Dana Khusus tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
    }

    if (existing.status !== SpecialFundStatus.DRAFT) {
      throw ApiError.badRequest('Hanya Dana Khusus berstatus DRAFT yang dapat diubah');
    }

    const tMulai = input.tanggalMulai || existing.tanggalMulai;
    const tSelesai = input.tanggalSelesai || existing.tanggalSelesai;

    if (tMulai > tSelesai) {
      throw ApiError.badRequest('Tanggal mulai tidak boleh melebihi tanggal selesai');
    }

    if (input.targetNominal !== undefined && input.targetNominal < 0) {
      throw ApiError.badRequest('Target nominal tidak boleh kurang dari 0');
    }

    if (input.code && input.code !== existing.code) {
      const codeDup = await prisma.specialFund.findUnique({
        where: {
          parokiId_code: {
            parokiId,
            code: input.code,
          },
        },
      });
      if (codeDup) {
        throw ApiError.badRequest(`Kode Dana Khusus "${input.code}" sudah terdaftar`);
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
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
          throw ApiError.badRequest(`Kode Pos Dana "${input.code}" sudah terdaftar`);
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
          throw ApiError.badRequest(`Nama Pos Dana "Dana Khusus: ${input.name}" sudah terdaftar`);
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

    await prisma.auditLog.create({
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
  static async deleteSpecialFund(parokiId: string, id: string, userId: string) {
    const existing = await prisma.specialFund.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Dana Khusus tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
    }

    if (existing.status !== SpecialFundStatus.DRAFT) {
      throw ApiError.badRequest('Hanya Dana Khusus berstatus DRAFT yang dapat dihapus');
    }

    // Check if any transactions have linked to it (just in case)
    const txCount = await prisma.cashTransaction.count({
      where: { specialFundId: id },
    });

    if (txCount > 0) {
      throw ApiError.badRequest('Tidak dapat menghapus Dana Khusus yang memiliki histori transaksi');
    }

    await prisma.$transaction(async (tx) => {
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

    await prisma.auditLog.create({
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
  static async activateSpecialFund(parokiId: string, id: string, userId: string) {
    const existing = await prisma.specialFund.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Dana Khusus tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
    }

    if (existing.status !== SpecialFundStatus.DRAFT) {
      throw ApiError.badRequest('Hanya Dana Khusus berstatus DRAFT yang dapat diaktifkan');
    }

    const updated = await prisma.specialFund.update({
      where: { id },
      data: { status: SpecialFundStatus.AKTIF },
    });

    await prisma.auditLog.create({
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
  static async closeSpecialFund(parokiId: string, id: string, userId: string) {
    const existing = await prisma.specialFund.findUnique({
      where: { id },
    });

    if (!existing) {
      throw ApiError.notFound('Dana Khusus tidak ditemukan');
    }

    if (existing.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
    }

    if (existing.status !== SpecialFundStatus.AKTIF) {
      throw ApiError.badRequest('Hanya Dana Khusus berstatus AKTIF yang dapat ditutup');
    }

    const updated = await prisma.specialFund.update({
      where: { id },
      data: { status: SpecialFundStatus.DITUTUP },
    });

    await prisma.auditLog.create({
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
  static async allocateRemainingBalance(
    parokiId: string,
    id: string,
    userId: string,
    input: {
      targetPosDanaId: string;
      nominal: number;
      keterangan?: string;
    }
  ) {
    const specialFund = await prisma.specialFund.findUnique({
      where: { id },
    });

    if (!specialFund) {
      throw ApiError.notFound('Dana Khusus tidak ditemukan');
    }

    if (specialFund.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
    }

    if (specialFund.status !== SpecialFundStatus.DITUTUP) {
      throw ApiError.badRequest('Alokasi sisa dana hanya dapat dilakukan setelah Dana Khusus DITUTUP');
    }

    const balanceNum = Number(specialFund.balance);
    if (balanceNum < input.nominal) {
      throw ApiError.badRequest(`Nominal alokasi (${input.nominal}) tidak boleh melebihi sisa saldo Dana Khusus (${balanceNum})`);
    }

    const targetPos = await prisma.fundCategory.findUnique({
      where: { id: input.targetPosDanaId },
    });

    if (!targetPos) {
      throw ApiError.notFound('Pos Dana tujuan tidak ditemukan');
    }

    if (targetPos.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Pos Dana tujuan berada di luar paroki Anda');
    }

    // Run within a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
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
        throw ApiError.badRequest('Tipe pendapatan aktif tidak ditemukan. Harap buat tipe pendapatan terlebih dahulu.');
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
        throw ApiError.badRequest('Tipe pengeluaran aktif tidak ditemukan. Harap buat tipe pengeluaran terlebih dahulu.');
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
  static async getSpecialFundTransactions(parokiId: string, id: string) {
    // Verify paroki scope
    const fund = await prisma.specialFund.findUnique({
      where: { id },
    });

    if (!fund) {
      throw ApiError.notFound('Dana Khusus tidak ditemukan');
    }

    if (fund.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
    }

    return await prisma.cashTransaction.findMany({
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
  static async getSpecialFundReport(parokiId: string, id: string) {
    const fund = await prisma.specialFund.findUnique({
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
      throw ApiError.notFound('Dana Khusus tidak ditemukan');
    }

    if (fund.parokiId !== parokiId) {
      throw ApiError.forbidden('Akses ditolak: Dana Khusus berada di luar paroki Anda');
    }

    const transactions = await prisma.cashTransaction.findMany({
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
