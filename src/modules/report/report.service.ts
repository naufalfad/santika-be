import { prisma } from '../../config/database';

export class ReportService {
  private static BASE_SALDO_AWAL = 1000000000; // Rp 1.000.000.000

  /**
   * Helper to parse period (YYYY-MM) and return start and end dates in UTC
   */
  private static getPeriodDateRange(periodStr?: string) {
    let year: number;
    let month: number;

    if (periodStr) {
      const [yearPart, monthPart] = periodStr.split('-');
      year = parseInt(yearPart, 10);
      month = parseInt(monthPart, 10);
    } else {
      const now = new Date();
      year = now.getFullYear();
      month = now.getMonth() + 1; // 1-indexed
    }

    const startDate = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year, month, 1, 0, 0, 0));

    return { startDate, endDate, year, month };
  }

  /**
   * 1. Buku Kas Umum (BKU)
   */
  static async getBkuReport(parokiId: string, periodStr?: string, search?: string) {
    const { startDate, endDate } = this.getPeriodDateRange(periodStr);

    // Calculate starting balance before startDate
    const incomeBefore = await prisma.cashTransaction.aggregate({
      where: {
        parokiId,
        transactionType: 'INCOME',
        transactionDate: { lt: startDate },
      },
      _sum: {
        amount: true,
      },
    });

    const expenseBefore = await prisma.cashTransaction.aggregate({
      where: {
        parokiId,
        transactionType: 'EXPENSE',
        transactionDate: { lt: startDate },
      },
      _sum: {
        amount: true,
      },
    });

    const totalIncomeBefore = Number(incomeBefore._sum.amount || 0);
    const totalExpenseBefore = Number(expenseBefore._sum.amount || 0);
    const startingBalance = this.BASE_SALDO_AWAL + totalIncomeBefore - totalExpenseBefore;

    // Fetch all transactions in the selected period
    const transactions = await prisma.cashTransaction.findMany({
      where: {
        parokiId,
        transactionDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        fundCategory: true,
        incomeType: true,
        expenseType: true,
      },
      orderBy: [
        { transactionDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    // Compute running balance chronologically
    let runningSaldo = startingBalance;
    const allRecords = transactions.map((tx) => {
      const masuk = tx.transactionType === 'INCOME' ? Number(tx.amount) : 0;
      const keluar = tx.transactionType === 'EXPENSE' ? Number(tx.amount) : 0;
      runningSaldo = runningSaldo + masuk - keluar;

      let sourceOrRecipient = '';
      if (tx.transactionType === 'INCOME') {
        sourceOrRecipient = tx.incomeType?.name || 'Kas Masuk';
      } else {
        sourceOrRecipient = tx.expenseType?.name || 'Kas Keluar';
      }

      return {
        id: tx.id,
        tanggal: tx.transactionDate.toISOString().split('T')[0],
        keterangan: `${sourceOrRecipient} - ${tx.description || ''}`,
        ref: tx.transactionNo,
        masuk,
        keluar,
        saldo: runningSaldo,
      };
    });

    // Prepend starting balance from previous month
    const prevMonthDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
    const formattedPrevDate = prevMonthDate.toISOString().split('T')[0];
    const startingRecord = {
      id: 'STARTING_BALANCE',
      tanggal: formattedPrevDate,
      keterangan: 'Saldo Pindahan dari Bulan Sebelumnya',
      ref: '-',
      masuk: 0,
      keluar: 0,
      saldo: startingBalance,
    };
    allRecords.unshift(startingRecord);


    // Filter records in-memory if search parameter is provided
    let filteredRecords = allRecords;
    if (search) {
      const searchLower = search.toLowerCase();
      filteredRecords = allRecords.filter(
        (rec) =>
          rec.keterangan.toLowerCase().includes(searchLower) ||
          rec.ref.toLowerCase().includes(searchLower)
      );
    }

    const totalMasuk = filteredRecords.reduce((sum, r) => sum + r.masuk, 0);
    const totalKeluar = filteredRecords.reduce((sum, r) => sum + r.keluar, 0);
    const endingSaldo = allRecords.length > 0 ? allRecords[allRecords.length - 1].saldo : startingBalance;

    return {
      startingBalance,
      endingSaldo,
      totalMasuk,
      totalKeluar,
      records: filteredRecords,
    };
  }

  /**
   * 2. Arus Kas
   */
  static async getCashFlowReport(parokiId: string, periodStr?: string) {
    const { startDate, endDate } = this.getPeriodDateRange(periodStr);

    const transactions = await prisma.cashTransaction.findMany({
      where: {
        parokiId,
        transactionDate: {
          gte: startDate,
          lt: endDate,
        },
      },
      include: {
        incomeType: true,
        expenseType: true,
        fundCategory: true,
      },
    });

    // Define inbound buckets
    let inboundKolekte = 0;
    let inboundDonasi = 0;
    let inboundPembangunan = 0;
    let inboundLainnya = 0;

    // Define outbound buckets
    let outboundOperasional = 0;
    let outboundLiturgi = 0;
    let outboundKegiatan = 0;

    // Grouping logic matching domain requirements
    transactions.forEach((tx) => {
      const amount = Number(tx.amount);

      if (tx.transactionType === 'INCOME') {
        const typeCode = tx.incomeType?.code || '';

        if (typeCode.includes('KOLEKTE')) {
          inboundKolekte += amount;
        } else if (typeCode === 'DONASI_PEMBANGUNAN') {
          inboundPembangunan += amount;
        } else if (typeCode.includes('DONASI') || typeCode === 'APP') {
          inboundDonasi += amount;
        } else {
          inboundLainnya += amount;
        }
      } else if (tx.transactionType === 'EXPENSE') {
        const catCode = tx.fundCategory?.code || '';
        const typeCode = tx.expenseType?.code || '';

        const isOps =
          catCode === 'OPERASIONAL' ||
          [
            'LISTRIK',
            'AIR',
            'INTERNET',
            'GAJI_KARYAWAN',
            'ATK',
            'PEMELIHARAAN_GEDUNG',
            'PEMELIHARAAN_KENDARAAN',
          ].includes(typeCode);

        const isLiturgi = catCode === 'LITURGI' || ['HOSTI', 'ANGGUR_MISA'].includes(typeCode);

        if (isOps) {
          outboundOperasional += amount;
        } else if (isLiturgi) {
          outboundLiturgi += amount;
        } else {
          outboundKegiatan += amount;
        }
      }
    });

    const totalPenerimaanKas = inboundKolekte + inboundDonasi + inboundPembangunan + inboundLainnya;
    const totalPengeluaranKas = outboundOperasional + outboundLiturgi + outboundKegiatan;
    const kenaikanBersihKas = totalPenerimaanKas - totalPengeluaranKas;

    return {
      inboundKolekte,
      inboundDonasi,
      inboundPembangunan,
      inboundLainnya,
      totalPenerimaanKas,
      outboundOperasional,
      outboundLiturgi,
      outboundKegiatan,
      totalPengeluaranKas,
      kenaikanBersihKas,
    };
  }

  /**
   * 3. Realisasi Anggaran
   */
  static async getBudgetRealisationReport(parokiId: string, yearVal?: number) {
    const year = yearVal || new Date().getFullYear();

    const startDate = new Date(Date.UTC(year, 0, 1, 0, 0, 0));
    const endDate = new Date(Date.UTC(year + 1, 0, 1, 0, 0, 0));

    // Fetch budgets for the selected year
    const budgets = await prisma.budget.findMany({
      where: {
        parokiId,
        tahun: year,
      },
      include: {
        fundCategory: true,
        items: {
          include: {
            cashTransactions: {
              where: {
                transactionType: 'EXPENSE',
                transactionDate: {
                  gte: startDate,
                  lt: endDate,
                },
              },
            },
          },
        },
      },
      orderBy: {
        fundCategory: {
          name: 'asc',
        },
      },
    });

    return budgets.map((b, index) => {
      let totalPlafon = 0;
      let totalRealisasi = 0;

      b.items.forEach((item) => {
        totalPlafon += Number(item.plafon);
        item.cashTransactions.forEach((tx) => {
          totalRealisasi += Number(tx.amount);
        });
      });

      const sisa = totalPlafon - totalRealisasi;
      const persen = totalPlafon > 0 ? (totalRealisasi / totalPlafon) * 100 : 0;

      return {
        id: index + 1,
        nama: b.fundCategory.name,
        anggaran: totalPlafon,
        realisasi: totalRealisasi,
        sisa,
        persen,
      };
    });
  }
}
