import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role, KategoriKegiatan, PrioritasKegiatan, StatusKegiatan, StatusPermohonanAnggaran, SpjStatus, FileType, SpecialFundStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function getYYYYMMDD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const r = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${r}`;
}

async function createSpjLampiran(spjId: string, category: string, fileName: string, fileUrl: string) {
  const attachment = await prisma.attachment.create({
    data: {
      fileName,
      fileType: fileName.endsWith('.pdf') ? FileType.PDF : FileType.IMAGE,
      fileUrl,
      fileSize: 100000 + Math.floor(Math.random() * 500000), // 100kb - 600kb
    }
  });

  return await prisma.spjLampiran.create({
    data: {
      kategoriFile: category,
      spjId,
      attachmentId: attachment.id,
    }
  });
}

async function main() {
  console.log('🌱 Starting database seeding with highly realistic data...');

  // 1. Clean up existing data in order of dependency
  await prisma.auditLog.deleteMany({});
  await prisma.approvalHistory.deleteMany({});
  await prisma.spjLampiran.deleteMany({});
  await prisma.spj.deleteMany({});
  await prisma.permohonanAnggaranDetail.deleteMany({});
  await prisma.permohonanAnggaran.deleteMany({});
  await prisma.kegiatanDokumen.deleteMany({});
  await prisma.pengajuanKegiatan.deleteMany({});
  await prisma.cashTransaction.deleteMany({});
  await prisma.specialFundAllocation.deleteMany({});
  await prisma.specialFund.deleteMany({});
  await prisma.budgetItem.deleteMany({});
  await prisma.budget.deleteMany({});
  await prisma.fundCategory.deleteMany({});
  await prisma.incomeType.deleteMany({});
  await prisma.expenseType.deleteMany({});
  await prisma.komisi.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.paroki.deleteMany({});

  console.log('🧹 Cleaned up old records.');

  // 2. Create default Paroki
  const paroki = await prisma.paroki.create({
    data: {
      nama: 'Paroki Santo Yosef',
      alamat: 'Jl. Pemuda No. 12, Semarang',
      keuskupan: 'Keuskupan Agung Semarang',
    },
  });

  console.log(`⛪ Created Paroki: ${paroki.nama}`);

  // Seed Fund Categories
  const fundCategories = [
    { code: 'OPERASIONAL', name: 'Operasional', description: 'Dana Operasional Paroki' },
    { code: 'LITURGI', name: 'Liturgi', description: 'Dana Liturgi' },
    { code: 'PEMBANGUNAN', name: 'Pembangunan', description: 'Dana Pembangunan' },
    { code: 'PEMELIHARAAN_ASET', name: 'Pemeliharaan Aset', description: 'Dana Pemeliharaan Aset' },
    { code: 'PSE', name: 'PSE (Sosial)', description: 'Dana Pengembangan Sosial Ekonomi' },
    { code: 'PENDIDIKAN', name: 'Pendidikan', description: 'Dana Pendidikan' },
    { code: 'OMK', name: 'OMK', description: 'Dana Orang Muda Katolik' },
    { code: 'LINGKUNGAN', name: 'Lingkungan', description: 'Dana Lingkungan' },
    { code: 'KOMISI', name: 'Komisi', description: 'Dana Komisi-komisi Paroki' },
    { code: 'KEUSKUPAN', name: 'Keuskupan', description: 'Dana Keuskupan' },
    { code: 'MISI', name: 'Misi', description: 'Dana Misi' },
    { code: 'CADANGAN', name: 'Cadangan', description: 'Dana Cadangan / Darurat' },
    { code: 'KHUSUS', name: 'Khusus', description: 'Dana Khusus / Event' },
    // Special Fund dedicated categories
    { code: 'SF_KAPEL', name: 'Dana Khusus Kapel St. Yohanes', description: 'Dana Khusus Pembangunan Kapel St. Yohanes' },
    { code: 'SF_AMBULANS', name: 'Dana Khusus Ambulans Paroki', description: 'Dana Khusus Pengadaan Ambulans Paroki' },
    { code: 'SF_PASTORAN', name: 'Dana Khusus Renovasi Pastoran', description: 'Dana Khusus Renovasi Gedung Pastoran' },
  ];

  for (const fund of fundCategories) {
    await prisma.fundCategory.create({
      data: {
        code: fund.code,
        name: fund.name,
        description: fund.description,
        isActive: true,
        parokiId: paroki.id,
      },
    });
  }
  console.log('✅ Seeded Fund Categories.');

  // Seed Income Types
  const incomeTypes = [
    { code: 'KOLEKTE_MINGGUAN', name: 'Kolekte Mingguan', description: 'Kolekte Misa Hari Minggu' },
    { code: 'KOLEKTE_HARIAN', name: 'Kolekte Harian', description: 'Kolekte Misa Harian' },
    { code: 'PERSEMBAHAN', name: 'Persembahan', description: 'Persembahan Umat' },
    { code: 'DONASI', name: 'Donasi', description: 'Donasi / Sumbangan Umum' },
    { code: 'DONASI_PEMBANGUNAN', name: 'Donasi Pembangunan', description: 'Donasi khusus Pembangunan' },
    { code: 'DONASI_PENDIDIKAN', name: 'Donasi Pendidikan', description: 'Donasi khusus Pendidikan' },
    { code: 'DONASI_SOSIAL', name: 'Donasi Sosial', description: 'Donasi khusus Sosial / PSE' },
    { code: 'APP', name: 'Aksi Puasa Pembangunan (APP)', description: 'Dana APP' },
    { code: 'SEWA_AULA', name: 'Sewa Aula', description: 'Penerimaan dari Sewa Aula' },
    { code: 'SEWA_PARKIR', name: 'Sewa Parkir', description: 'Penerimaan dari Sewa Lahan Parkir' },
    { code: 'BUNGA_DEPOSITO', name: 'Bunga Deposito', description: 'Pendapatan Bunga Deposito' },
    { code: 'HASIL_INVESTASI', name: 'Hasil Investasi', description: 'Pendapatan dari Hasil Investasi' },
    { code: 'PENDAPATAN_LAINNYA', name: 'Pendapatan Lainnya', description: 'Pendapatan operasional lainnya' },
  ];

  for (const inc of incomeTypes) {
    await prisma.incomeType.create({
      data: {
        code: inc.code,
        name: inc.name,
        description: inc.description,
        isActive: true,
        parokiId: paroki.id,
      },
    });
  }
  console.log('✅ Seeded Income Types.');

  // Seed Expense Types
  const expenseTypes = [
    { code: 'LISTRIK', name: 'Listrik', description: 'Biaya utilitas listrik' },
    { code: 'AIR', name: 'Air', description: 'Biaya utilitas air' },
    { code: 'INTERNET', name: 'Internet', description: 'Biaya utilitas internet' },
    { code: 'GAJI_KARYAWAN', name: 'Gaji Karyawan', description: 'Biaya SDM / Gaji' },
    { code: 'ATK', name: 'ATK', description: 'Biaya Administrasi / ATK' },
    { code: 'HOSTI', name: 'Hosti', description: 'Biaya Hosti Liturgi' },
    { code: 'ANGGUR_MISA', name: 'Anggur Misa', description: 'Biaya Anggur Misa Liturgi' },
    { code: 'BANTUAN_SOSIAL', name: 'Bantuan Sosial', description: 'Bantuan Sosial kemasyarakatan' },
    { code: 'BANTUAN_KESEHATAN', name: 'Bantuan Kesehatan', description: 'Bantuan Kesehatan umat' },
    { code: 'MATERIAL_BANGUNAN', name: 'Material Bangunan', description: 'Biaya belanja material bangunan' },
    { code: 'UPAH_TUKANG', name: 'Upah Tukang', description: 'Biaya upah tenaga tukang' },
    { code: 'SEMINAR', name: 'Seminar', description: 'Biaya pelaksanaan seminar' },
    { code: 'PELATIHAN', name: 'Pelatihan', description: 'Biaya pelatihan dan pembinaan' },
    { code: 'RETRET', name: 'Retret', description: 'Biaya pelaksanaan retret' },
    { code: 'REKOLEKSI', name: 'Rekoleksi', description: 'Biaya pelaksanaan rekoleksi' },
    { code: 'GATHERING', name: 'Gathering', description: 'Biaya gathering dan kebersamaan' },
    { code: 'PEMELIHARAAN_GEDUNG', name: 'Pemeliharaan Gedung', description: 'Biaya perawatan gedung' },
    { code: 'PEMELIHARAAN_KENDARAAN', name: 'Pemeliharaan Kendaraan', description: 'Biaya perawatan kendaraan' },
  ];

  for (const exp of expenseTypes) {
    await prisma.expenseType.create({
      data: {
        code: exp.code,
        name: exp.name,
        description: exp.description,
        isActive: true,
        parokiId: paroki.id,
      },
    });
  }
  console.log('✅ Seeded Expense Types.');

  // Create default Komisi
  const komisiLiturgi = await prisma.komisi.create({
    data: { nama: 'Komisi Liturgi', parokiId: paroki.id },
  });
  const komisiPSE = await prisma.komisi.create({
    data: { nama: 'Komisi PSE (Pengembangan Sosial Ekonomi)', parokiId: paroki.id },
  });
  const komisiOMK = await prisma.komisi.create({
    data: { nama: 'Komisi Kepemudaan (OMK)', parokiId: paroki.id },
  });
  const komisiKateketik = await prisma.komisi.create({
    data: { nama: 'Komisi Kateketik (Pendidikan Iman)', parokiId: paroki.id },
  });
  const komisiSarpras = await prisma.komisi.create({
    data: { nama: 'Bagian Sarana Prasarana (Pemeliharaan)', parokiId: paroki.id },
  });
  console.log('📋 Created default Komisi records.');

  // Hash password for users
  const hashedPassword = await bcrypt.hash('password123', 10);

  const usersToCreate = [
    { email: 'admin@santika.org', name: 'Super Admin Santika', role: Role.SUPER_ADMIN },
    { email: 'pastor@santika.org', name: 'Romo Yohanes, Pr', role: Role.PASTOR },
    { email: 'bendahara@santika.org', name: 'Ibu Maria Susanti', role: Role.BENDAHARA },
    { email: 'dewan@santika.org', name: 'Bapak FX. Bambang', role: Role.DEWAN_KEUANGAN },
    { email: 'komisi@santika.org', name: 'Bapak Ignatius Sutrisno', role: Role.KETUA_KOMISI },
    { email: 'pembangunan@santika.org', name: 'Bapak Thomas Wijaya', role: Role.TIM_PEMBANGUNAN },
    { email: 'sekretariat@santika.org', name: 'Sdri. Anastasia Eka', role: Role.SEKRETARIAT },
  ];

  for (const userData of usersToCreate) {
    await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
        isActive: true,
        parokiId: paroki.id,
      },
    });
    console.log(`👤 Created User: ${userData.name} (${userData.role})`);
  }

  // Fetch created users
  const adminUser = await prisma.user.findUnique({ where: { email: 'admin@santika.org' } });
  const pastorUser = await prisma.user.findUnique({ where: { email: 'pastor@santika.org' } });
  const bendaharaUser = await prisma.user.findUnique({ where: { email: 'bendahara@santika.org' } });
  const dewanUser = await prisma.user.findUnique({ where: { email: 'dewan@santika.org' } });
  const komisiUser = await prisma.user.findUnique({ where: { email: 'komisi@santika.org' } });
  const pembangunanUser = await prisma.user.findUnique({ where: { email: 'pembangunan@santika.org' } });
  const sekretariatUser = await prisma.user.findUnique({ where: { email: 'sekretariat@santika.org' } });

  // Get Pos Dana references
  const dbFunds = await prisma.fundCategory.findMany({ where: { parokiId: paroki.id } });
  const operasionalFund = dbFunds.find((f) => f.code === 'OPERASIONAL')!;
  const liturgiFund = dbFunds.find((f) => f.code === 'LITURGI')!;
  const pseFund = dbFunds.find((f) => f.code === 'PSE')!;
  const omkFund = dbFunds.find((f) => f.code === 'OMK')!;
  const pemeliharaanFund = dbFunds.find((f) => f.code === 'PEMELIHARAAN_ASET')!;
  const pendidikanFund = dbFunds.find((f) => f.code === 'PENDIDIKAN')!;
  const pembangunanFund = dbFunds.find((f) => f.code === 'PEMBANGUNAN')!;

  const fcKapel = dbFunds.find((f) => f.code === 'SF_KAPEL')!;
  const fcAmbulans = dbFunds.find((f) => f.code === 'SF_AMBULANS')!;
  const fcPastoran = dbFunds.find((f) => f.code === 'SF_PASTORAN')!;

  // Create Budget for 2025 (Historical)
  console.log('💰 Seeding 2025 Budgets (Historical)...');
  const budgetLiturgi2025 = await prisma.budget.create({
    data: { tahun: 2025, fundCategoryId: liturgiFund.id, parokiId: paroki.id }
  });
  const biLiturgi2025 = await prisma.budgetItem.create({
    data: { budgetId: budgetLiturgi2025.id, name: 'Perlengkapan Liturgi & Sakramen 2025', plafon: 35000000.00, komisiId: komisiLiturgi.id }
  });

  const budgetOMK2025 = await prisma.budget.create({
    data: { tahun: 2025, fundCategoryId: omkFund.id, parokiId: paroki.id }
  });
  const biOmk2025 = await prisma.budgetItem.create({
    data: { budgetId: budgetOMK2025.id, name: 'Kegiatan Kepemudaan OMK 2025', plafon: 25000000.00, komisiId: komisiOMK.id }
  });

  const budgetPSE2025 = await prisma.budget.create({
    data: { tahun: 2025, fundCategoryId: pseFund.id, parokiId: paroki.id }
  });
  const biPse2025 = await prisma.budgetItem.create({
    data: { budgetId: budgetPSE2025.id, name: 'Bantuan Sosial PSE 2025', plafon: 70000000.00, komisiId: komisiPSE.id }
  });

  // Create Budget for 2026 (Current)
  console.log('💰 Seeding 2026 Budgets (Current)...');
  // Liturgi Budget
  const budgetLiturgi2026 = await prisma.budget.create({
    data: { tahun: 2026, fundCategoryId: liturgiFund.id, parokiId: paroki.id }
  });
  const biLiturgiPerlengkapan2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetLiturgi2026.id, name: 'Perlengkapan Liturgi & Sakramen', plafon: 50000000.00, komisiId: komisiLiturgi.id }
  });
  const biLiturgiHias2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetLiturgi2026.id, name: 'Hias Altar Misa', plafon: 30000000.00, komisiId: komisiLiturgi.id }
  });
  const biLiturgiPembinaan2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetLiturgi2026.id, name: 'Pembinaan Lektor & Misdinar', plafon: 15000000.00, komisiId: komisiLiturgi.id }
  });

  // PSE Budget
  const budgetPSE2026 = await prisma.budget.create({
    data: { tahun: 2026, fundCategoryId: pseFund.id, parokiId: paroki.id }
  });
  const biPseSembako2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetPSE2026.id, name: 'Bantuan Sembako Umat', plafon: 60000000.00, komisiId: komisiPSE.id }
  });
  const biPseBeasiswa2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetPSE2026.id, name: 'Beasiswa Anak Sekolah', plafon: 50000000.00, komisiId: komisiPSE.id }
  });
  const biPseKesehatan2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetPSE2026.id, name: 'Bantuan Kesehatan Umat', plafon: 40000000.00, komisiId: komisiPSE.id }
  });

  // OMK Budget
  const budgetOMK2026 = await prisma.budget.create({
    data: { tahun: 2026, fundCategoryId: omkFund.id, parokiId: paroki.id }
  });
  const biOmkPaskahNatal2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetOMK2026.id, name: 'Kegiatan Paskah & Natal OMK', plafon: 25000000.00, komisiId: komisiOMK.id }
  });
  const biOmkRetret2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetOMK2026.id, name: 'Retret & Pembinaan Iman OMK', plafon: 30000000.00, komisiId: komisiOMK.id }
  });

  // Operasional Budget (non-committee)
  const budgetOperasional2026 = await prisma.budget.create({
    data: { tahun: 2026, fundCategoryId: operasionalFund.id, parokiId: paroki.id }
  });
  const biOpGaji = await prisma.budgetItem.create({
    data: { budgetId: budgetOperasional2026.id, name: 'Gaji Karyawan & Koster', plafon: 180000000.00 }
  });
  const biOpListrik = await prisma.budgetItem.create({
    data: { budgetId: budgetOperasional2026.id, name: 'Listrik, Air & Internet', plafon: 60000000.00 }
  });

  // Pemeliharaan Budget
  const budgetPemeliharaan2026 = await prisma.budget.create({
    data: { tahun: 2026, fundCategoryId: pemeliharaanFund.id, parokiId: paroki.id }
  });
  const biPemeliharaanGedung2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetPemeliharaan2026.id, name: 'Pemeliharaan Gedung Gereja', plafon: 100000000.00, komisiId: komisiSarpras.id }
  });
  const biPemeliharaanAc2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetPemeliharaan2026.id, name: 'Perawatan AC & Sound System', plafon: 40000000.00, komisiId: komisiSarpras.id }
  });

  // Pendidikan Budget
  const budgetPendidikan2026 = await prisma.budget.create({
    data: { tahun: 2026, fundCategoryId: pendidikanFund.id, parokiId: paroki.id }
  });
  const biPendidikanBia2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetPendidikan2026.id, name: 'Pembinaan BIA & BIR', plafon: 20000000.00, komisiId: komisiKateketik.id }
  });
  const biPendidikanKomuni2026 = await prisma.budgetItem.create({
    data: { budgetId: budgetPendidikan2026.id, name: 'Persiapan Komuni Pertama', plafon: 15000000.00, komisiId: komisiKateketik.id }
  });

  console.log('✅ Budgets and Budget Items seeded.');

  // Create Special Funds
  console.log('💎 Seeding Special Funds (Dana Khusus)...');
  const sfKapel = await prisma.specialFund.create({
    data: {
      code: 'SF-001',
      name: 'Pembangunan Kapel St. Yohanes',
      description: 'Pembangunan kapel cabang baru untuk wilayah pastoral pinggiran paroki',
      tujuanPenggalangan: 'Penyediaan lahan dan pembangunan gedung kapel berkapasitas 250 umat',
      targetNominal: 500000000.00,
      balance: 388000000.00,
      income: 388000000.00,
      expense: 0.00,
      tanggalMulai: new Date('2025-01-01T00:00:00Z'),
      tanggalSelesai: new Date('2026-12-31T23:59:59Z'),
      status: SpecialFundStatus.AKTIF,
      parokiId: paroki.id,
      fundCategoryId: fcKapel.id,
    }
  });

  const sfAmbulans = await prisma.specialFund.create({
    data: {
      code: 'SF-002',
      name: 'Pengadaan Mobil Ambulans Paroki',
      description: 'Pengadaan unit ambulans gratis untuk pelayanan PSE dan kedaruratan umat',
      tujuanPenggalangan: 'Pembelian 1 unit mobil ambulans tipe Suzuki APV beserta modifikasi interior medis',
      targetNominal: 250000000.00,
      balance: 185000000.00,
      income: 185000000.00,
      expense: 0.00,
      tanggalMulai: new Date('2026-01-01T00:00:00Z'),
      tanggalSelesai: new Date('2026-08-30T23:59:59Z'),
      status: SpecialFundStatus.AKTIF,
      parokiId: paroki.id,
      fundCategoryId: fcAmbulans.id,
    }
  });

  const sfPastoran = await prisma.specialFund.create({
    data: {
      code: 'SF-003',
      name: 'Renovasi Gedung Pastoran',
      description: 'Renovasi atap bocor dan perluasan ruang tamu pastoran',
      tujuanPenggalangan: 'Renovasi struktural gedung pastoran paroki',
      targetNominal: 150000000.00,
      balance: 0.00,
      income: 150000000.00,
      expense: 150000000.00,
      tanggalMulai: new Date('2025-06-01T00:00:00Z'),
      tanggalSelesai: new Date('2025-12-31T23:59:59Z'),
      status: SpecialFundStatus.DITUTUP,
      parokiId: paroki.id,
      fundCategoryId: fcPastoran.id,
    }
  });

  // Get Income & Expense Type references
  const itKolekteMingguan = await prisma.incomeType.findFirst({ where: { code: 'KOLEKTE_MINGGUAN' } });
  const itPersembahan = await prisma.incomeType.findFirst({ where: { code: 'PERSEMBAHAN' } });
  const itDonasi = await prisma.incomeType.findFirst({ where: { code: 'DONASI' } });
  const itDonasiPembangunan = await prisma.incomeType.findFirst({ where: { code: 'DONASI_PEMBANGUNAN' } });
  const itSewaAula = await prisma.incomeType.findFirst({ where: { code: 'SEWA_AULA' } });

  const etListrik = await prisma.expenseType.findFirst({ where: { code: 'LISTRIK' } });
  const etAir = await prisma.expenseType.findFirst({ where: { code: 'AIR' } });
  const etInternet = await prisma.expenseType.findFirst({ where: { code: 'INTERNET' } });
  const etGaji = await prisma.expenseType.findFirst({ where: { code: 'GAJI_KARYAWAN' } });
  const etMaterial = await prisma.expenseType.findFirst({ where: { code: 'MATERIAL_BANGUNAN' } });
  const etAtk = await prisma.expenseType.findFirst({ where: { code: 'ATK' } });

  let txInSeq = 1;
  let txOutSeq = 1;

  // 3. Dynamic Weekly Collection Incomes (Sundays) — 18 Months
  console.log('📈 Seeding weekly Sunday collections (Jan 2025 - June 2026)...');
  const sundays: Date[] = [];
  let currentDate = new Date('2025-01-01T00:00:00Z');
  const endDate = new Date('2026-06-15T00:00:00Z');
  while (currentDate <= endDate) {
    if (currentDate.getUTCDay() === 0) {
      sundays.push(new Date(currentDate));
    }
    currentDate.setUTCDate(currentDate.getUTCDate() + 1);
  }

  for (let i = 0; i < sundays.length; i++) {
    const sundayDate = sundays[i];
    const dateStr = getYYYYMMDD(sundayDate);

    // Random amounts for realistic chart fluctuations
    const amountK1 = Math.floor(4500000 + Math.random() * 4000000); // 4.5M - 8.5M
    const amountK2 = Math.floor(2500000 + Math.random() * 3000000); // 2.5M - 5.5M
    const amountP = Math.floor(1500000 + Math.random() * 2000000);  // 1.5M - 3.5M

    // Kolekte I -> Liturgi Fund
    await prisma.cashTransaction.create({
      data: {
        transactionNo: `TX-IN-${dateStr}-${String(txInSeq++).padStart(4, '0')}`,
        transactionDate: sundayDate,
        transactionType: 'INCOME',
        fundCategoryId: liturgiFund.id,
        incomeTypeId: itKolekteMingguan!.id,
        amount: amountK1,
        description: `Kolekte I Misa Minggu - Tgl ${sundayDate.toLocaleDateString('id-ID')}`,
        createdById: bendaharaUser!.id,
        parokiId: paroki.id,
      }
    });

    // Kolekte II -> Pembangunan Fund
    await prisma.cashTransaction.create({
      data: {
        transactionNo: `TX-IN-${dateStr}-${String(txInSeq++).padStart(4, '0')}`,
        transactionDate: sundayDate,
        transactionType: 'INCOME',
        fundCategoryId: pembangunanFund.id,
        incomeTypeId: itKolekteMingguan!.id,
        amount: amountK2,
        description: `Kolekte II Misa Minggu (Khusus Pembangunan) - Tgl ${sundayDate.toLocaleDateString('id-ID')}`,
        createdById: bendaharaUser!.id,
        parokiId: paroki.id,
      }
    });

    // Persembahan -> Operasional Fund
    await prisma.cashTransaction.create({
      data: {
        transactionNo: `TX-IN-${dateStr}-${String(txInSeq++).padStart(4, '0')}`,
        transactionDate: sundayDate,
        transactionType: 'INCOME',
        fundCategoryId: operasionalFund.id,
        incomeTypeId: itPersembahan!.id,
        amount: amountP,
        description: `Persembahan Umat Misa Minggu - Tgl ${sundayDate.toLocaleDateString('id-ID')}`,
        createdById: bendaharaUser!.id,
        parokiId: paroki.id,
      }
    });
  }

  // 4. Monthly Rental Incomes (Sewa Aula)
  console.log('📈 Seeding monthly rental incomes...');
  let currentMonth = new Date('2025-01-15T00:00:00Z');
  const endMonth = new Date('2026-06-15T00:00:00Z');
  while (currentMonth <= endMonth) {
    const dateStr = getYYYYMMDD(currentMonth);
    const rentalAmount = Math.floor(3000000 + Math.random() * 3000000); // 3M - 6M
    await prisma.cashTransaction.create({
      data: {
        transactionNo: `TX-IN-${dateStr}-${String(txInSeq++).padStart(4, '0')}`,
        transactionDate: new Date(currentMonth),
        transactionType: 'INCOME',
        fundCategoryId: operasionalFund.id,
        incomeTypeId: itSewaAula!.id,
        amount: rentalAmount,
        description: `Penerimaan Sewa Aula Paroki untuk Acara Pernikahan / Resepsi - Tgl ${currentMonth.toLocaleDateString('id-ID')}`,
        createdById: bendaharaUser!.id,
        parokiId: paroki.id,
      }
    });
    currentMonth.setUTCMonth(currentMonth.getUTCMonth() + 1);
  }

  // 5. Monthly Utility Expenses (Jan 2025 - May 2026)
  console.log('📈 Seeding monthly fixed utilities expenses...');
  currentMonth = new Date('2025-01-01T00:00:00Z');
  const endExpenseMonth = new Date('2026-05-31T00:00:00Z');
  while (currentMonth <= endExpenseMonth) {
    const year = currentMonth.getUTCFullYear();
    const monthIndex = currentMonth.getUTCMonth();
    const monthNames = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const monthName = monthNames[monthIndex];

    // Internet (5th)
    const internetDate = new Date(year, monthIndex, 5);
    await prisma.cashTransaction.create({
      data: {
        transactionNo: `TX-OUT-${getYYYYMMDD(internetDate)}-${String(txOutSeq++).padStart(4, '0')}`,
        transactionDate: internetDate,
        transactionType: 'EXPENSE',
        fundCategoryId: operasionalFund.id,
        expenseTypeId: etInternet!.id,
        amount: 450000,
        description: `Pembayaran internet Wifi Pastoran Indihome Kecepatan 100Mbps Bulan ${monthName} ${year}`,
        createdById: bendaharaUser!.id,
        parokiId: paroki.id,
      }
    });

    // Listrik (10th)
    const listrikDate = new Date(year, monthIndex, 10);
    const listrikAmount = Math.floor(1800000 + Math.random() * 800000); // 1.8M - 2.6M
    await prisma.cashTransaction.create({
      data: {
        transactionNo: `TX-OUT-${getYYYYMMDD(listrikDate)}-${String(txOutSeq++).padStart(4, '0')}`,
        transactionDate: listrikDate,
        transactionType: 'EXPENSE',
        fundCategoryId: operasionalFund.id,
        expenseTypeId: etListrik!.id,
        amount: listrikAmount,
        description: `Tagihan Listrik PLN Kompleks Gereja & Pastoran Bulan ${monthName} ${year}`,
        createdById: bendaharaUser!.id,
        parokiId: paroki.id,
      }
    });

    // Air (10th)
    const airDate = new Date(year, monthIndex, 10);
    const airAmount = Math.floor(350000 + Math.random() * 250000); // 350K - 600K
    await prisma.cashTransaction.create({
      data: {
        transactionNo: `TX-OUT-${getYYYYMMDD(airDate)}-${String(txOutSeq++).padStart(4, '0')}`,
        transactionDate: airDate,
        transactionType: 'EXPENSE',
        fundCategoryId: operasionalFund.id,
        expenseTypeId: etAir!.id,
        amount: airAmount,
        description: `Tagihan Air PDAM Keperluan Gereja & Pastoran Bulan ${monthName} ${year}`,
        createdById: bendaharaUser!.id,
        parokiId: paroki.id,
      }
    });

    // Gaji Karyawan (25th)
    const gajiDate = new Date(year, monthIndex, 25);
    const gajiAmount = (year === 2025) ? 12000000 : 15000000;
    await prisma.cashTransaction.create({
      data: {
        transactionNo: `TX-OUT-${getYYYYMMDD(gajiDate)}-${String(txOutSeq++).padStart(4, '0')}`,
        transactionDate: gajiDate,
        transactionType: 'EXPENSE',
        fundCategoryId: operasionalFund.id,
        expenseTypeId: etGaji!.id,
        amount: gajiAmount,
        description: `Pembayaran Gaji Bulanan 3 Karyawan Paroki (Kebersihan & Koster) Bulan ${monthName} ${year}`,
        createdById: bendaharaUser!.id,
        parokiId: paroki.id,
      }
    });

    currentMonth.setUTCMonth(currentMonth.getUTCMonth() + 1);
  }

  // 6. Special Fund Incomes (Donations)
  console.log('💎 Seeding Special Fund donations...');
  const kapelIncomes = [
    { date: new Date('2025-03-10T10:00:00Z'), amount: 100000000, desc: 'Donasi Pembangunan Kapel St. Yohanes - Donatur Anonim' },
    { date: new Date('2025-07-15T14:30:00Z'), amount: 80000000, desc: 'Sumbangan Pembangunan dari Keluarga Bpk. Adrianus, Semarang' },
    { date: new Date('2025-12-20T20:00:00Z'), amount: 120000000, desc: 'Penerimaan Hasil Bersih Konser Amal Natal OMK untuk Kapel' },
    { date: new Date('2026-02-18T09:00:00Z'), amount: 50000000, desc: 'Penerimaan Dana Hibah Keuskupan Agung Semarang' },
    { date: new Date('2026-05-02T11:00:00Z'), amount: 38000000, desc: 'Penerimaan Aksi Kotak Pembangunan Wilayah Kapel' },
  ];
  for (const item of kapelIncomes) {
    await prisma.cashTransaction.create({
      data: {
        transactionNo: `TX-IN-${getYYYYMMDD(item.date)}-${String(txInSeq++).padStart(4, '0')}`,
        transactionDate: item.date,
        transactionType: 'INCOME',
        fundCategoryId: fcKapel.id,
        incomeTypeId: itDonasiPembangunan!.id,
        amount: item.amount,
        description: item.desc,
        createdById: bendaharaUser!.id,
        parokiId: paroki.id,
        specialFundId: sfKapel.id,
      }
    });
  }

  const ambulansIncomes = [
    { date: new Date('2026-01-15T11:00:00Z'), amount: 75000000, desc: 'Donasi Khusus Pengadaan Ambulans - Keluarga Bpk. Thomas Wijaya' },
    { date: new Date('2026-03-22T08:00:00Z'), amount: 60000000, desc: 'Pencairan Alokasi Dana APP Kemanusiaan Keuskupan' },
    { date: new Date('2026-05-18T10:15:00Z'), amount: 50000000, desc: 'Kolekte Aksi Kemanusiaan Pengadaan Unit Ambulans PSE' },
  ];
  for (const item of ambulansIncomes) {
    await prisma.cashTransaction.create({
      data: {
        transactionNo: `TX-IN-${getYYYYMMDD(item.date)}-${String(txInSeq++).padStart(4, '0')}`,
        transactionDate: item.date,
        transactionType: 'INCOME',
        fundCategoryId: fcAmbulans.id,
        incomeTypeId: itDonasi!.id,
        amount: item.amount,
        description: item.desc,
        createdById: bendaharaUser!.id,
        parokiId: paroki.id,
        specialFundId: sfAmbulans.id,
      }
    });
  }

  // sfPastoran Incomes and Expenses
  const pastoranIncomeDate = new Date('2025-06-10T13:00:00Z');
  await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-IN-${getYYYYMMDD(pastoranIncomeDate)}-${String(txInSeq++).padStart(4, '0')}`,
      transactionDate: pastoranIncomeDate,
      transactionType: 'INCOME',
      fundCategoryId: fcPastoran.id,
      incomeTypeId: itDonasi!.id,
      amount: 150000000,
      description: 'Sumbangan Tunggal Pembangunan Pastoran dari Bpk. FX. Bambang',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      specialFundId: sfPastoran.id,
    }
  });

  const pastoranExpenseDate = new Date('2025-09-01T10:00:00Z');
  await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-OUT-${getYYYYMMDD(pastoranExpenseDate)}-${String(txOutSeq++).padStart(4, '0')}`,
      transactionDate: pastoranExpenseDate,
      transactionType: 'EXPENSE',
      fundCategoryId: fcPastoran.id,
      expenseTypeId: etMaterial!.id,
      amount: 150000000,
      description: 'Pembayaran Kontraktor Renovasi Atap & Perluasan Ruang Tamu Pastoran PT. Pembangunan Jaya',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      specialFundId: sfPastoran.id,
      status: 'SELESAI',
    }
  });

  console.log('✅ Special Fund transactions completed.');

  // 7. Seed activities (PengajuanKegiatan & PermohonanAnggaran)
  console.log('📋 Seeding detailed parish projects and budget requests...');

  // --- CASE 1: Perayaan Natal Paroki 2025 (Historical - Liturgi - Completed) ---
  const kegNatal2025 = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2025-001',
      namaKegiatan: 'Perayaan Natal Paroki 2025',
      deskripsiKegiatan: 'Misa Natal utama malam Natal, Misa Natal pagi anak-anak, dan perayaan natal bersama pengurus paroki.',
      tujuanKegiatan: 'Merayakan hari kelahiran Yesus Kristus dengan khidmat dan kebersamaan seluruh umat paroki.',
      kategoriKegiatan: KategoriKegiatan.LITURGI,
      komisiId: komisiLiturgi.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Gereja Induk Santo Yosef',
      tanggalMulai: new Date('2025-12-24T17:00:00Z'),
      tanggalSelesai: new Date('2025-12-26T21:00:00Z'),
      jumlahPeserta: 1500,
      prioritas: PrioritasKegiatan.TINGGI,
      status: StatusKegiatan.SELESAI,
      catatanReview: 'Rencana bagus, mohon koordinasi dengan keamanan wilayah.',
    }
  });

  const reqNatal2025 = await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2025-001',
      kegiatanId: kegNatal2025.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2025-11-10T09:00:00Z'),
      estimasiBiaya: 30000000.00,
      jumlahDiajukan: 30000000.00,
      commandLine: undefined, // ignored by db
      jumlahDisetujui: 30000000.00,
      posDanaId: liturgiFund.id,
      reviewedById: bendaharaUser!.id,
      approvedById: pastorUser!.id,
      catatanReview: 'Disetujui penuh untuk mendukung kemeriahan Natal paroki.',
      status: StatusPermohonanAnggaran.SELESAI,
    } as any
  });

  await prisma.permohonanAnggaranDetail.createMany({
    data: [
      { permohonanId: reqNatal2025.id, uraian: 'Dekorasi Altar Malam & Hari Raya Natal', qty: 1, satuan: 'pkg', hargaSatuan: 10000000.00, subtotal: 10000000.00 },
      { permohonanId: reqNatal2025.id, uraian: 'Konsumsi Rapat & Petugas Liturgi (Misa Malam & Pagi)', qty: 300, satuan: 'box', hargaSatuan: 40000.00, subtotal: 12000000.00 },
      { permohonanId: reqNatal2025.id, uraian: 'Lilin Misa Natal & Buku Lagu Umat', qty: 1600, satuan: 'pcs', hargaSatuan: 5000.00, subtotal: 8000000.00 },
    ]
  });

  await prisma.approvalHistory.createMany({
    data: [
      { step: 'Review Kegiatan', action: 'APPROVE', catatan: 'Proposal Natal 2025 diajukan oleh komisi liturgi.', tanggal: new Date('2025-11-10T09:30:00Z'), picId: komisiUser!.id, kegiatanId: kegNatal2025.id },
      { step: 'Review Anggaran', action: 'APPROVE', catatan: 'Telah direview sesuai dengan sisa plafon liturgi 2025.', tanggal: new Date('2025-11-12T11:00:00Z'), picId: bendaharaUser!.id, permohonanAnggaranId: reqNatal2025.id },
      { step: 'Persetujuan Pastor', action: 'APPROVE', catatan: 'Disetujui. Semoga perayaan berjalan lancar.', tanggal: new Date('2025-11-15T15:00:00Z'), picId: pastorUser!.id, permohonanAnggaranId: reqNatal2025.id },
    ]
  });

  const txNatal2025Out = await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-OUT-20251215-001`,
      transactionDate: new Date('2025-12-15T09:00:00Z'),
      transactionType: 'EXPENSE',
      fundCategoryId: liturgiFund.id,
      expenseTypeId: etAtk!.id,
      budgetItemId: biLiturgi2025.id,
      permohonanAnggaranId: reqNatal2025.id,
      amount: 30000000.00,
      description: 'Pencairan Dana Uang Muka Kegiatan Natal Paroki 2025',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      isUangMuka: false,
      status: 'SELESAI',
    }
  });

  const spjNatal2025 = await prisma.spj.create({
    data: {
      title: 'Laporan SPJ Perayaan Natal Paroki 2025',
      amount: 29850000.00,
      status: SpjStatus.VERIFIED,
      uploadedBy: komisiUser!.name,
      kegiatanId: kegNatal2025.id,
      permohonanAnggaranId: reqNatal2025.id,
      posDanaId: liturgiFund.id,
      cashTransactionId: txNatal2025Out.id,
      createdAt: new Date('2025-12-29T10:00:00Z'),
    }
  });
  await createSpjLampiran(spjNatal2025.id, 'NOTA', 'nota_dekorasi_natal.pdf', '/uploads/nota_belanja_dummy.pdf');
  await createSpjLampiran(spjNatal2025.id, 'KWITANSI', 'kwitansi_konsumsi_natal.pdf', '/uploads/bukti_pembayaran_dummy.pdf');

  // Refund of 150,000
  await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-IN-20251230-001`,
      transactionDate: new Date('2025-12-30T14:00:00Z'),
      transactionType: 'INCOME',
      fundCategoryId: liturgiFund.id,
      incomeTypeId: itPersembahan!.id,
      amount: 150000.00,
      description: 'Pengembalian Sisa Lebih Anggaran Natal Paroki 2025 (Surplus SPJ)',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      parentTransactionId: txNatal2025Out.id,
    }
  });

  // --- CASE 2: Bursa Kerja (Job Fair) & Pelatihan OMK 2025 (Historical - OMK - Completed) ---
  const kegOMK2025 = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2025-002',
      namaKegiatan: 'Bursa Kerja (Job Fair) & Pelatihan OMK 2025',
      deskripsiKegiatan: 'Penyelenggaraan job fair lokal bekerja sama dengan 10 perusahaan mitra dan pelatihan pembuatan CV serta teknik wawancara.',
      tujuanKegiatan: 'Membantu penyerapan tenaga kerja di kalangan Orang Muda Katolik dan membekali keahlian kerja.',
      kategoriKegiatan: KategoriKegiatan.OMK,
      komisiId: komisiOMK.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Aula Besar Santo Yosef',
      tanggalMulai: new Date('2025-10-12T08:00:00Z'),
      tanggalSelesai: new Date('2025-10-12T17:00:00Z'),
      jumlahPeserta: 200,
      prioritas: PrioritasKegiatan.SEDANG,
      status: StatusKegiatan.SELESAI,
    }
  });

  const reqOMK2025 = await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2025-002',
      kegiatanId: kegOMK2025.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2025-09-10T10:00:00Z'),
      estimasiBiaya: 15000000.00,
      jumlahDiajukan: 15000000.00,
      jumlahDisetujui: 15000000.00,
      posDanaId: omkFund.id,
      reviewedById: bendaharaUser!.id,
      approvedById: pastorUser!.id,
      catatanReview: 'Bagus untuk OMK. Disetujui.',
      status: StatusPermohonanAnggaran.SELESAI,
    }
  });

  await prisma.permohonanAnggaranDetail.createMany({
    data: [
      { permohonanId: reqOMK2025.id, uraian: 'Sewa Partisi Booth Perusahaan & Banner Utama', qty: 10, satuan: 'unit', hargaSatuan: 500000.00, subtotal: 5000000.00 },
      { permohonanId: reqOMK2025.id, uraian: 'Fee Pembicara & Trainer HRD', qty: 2, satuan: 'org', hargaSatuan: 2000000.00, subtotal: 4000000.00 },
      { permohonanId: reqOMK2025.id, uraian: 'Konsumsi Snak & Makan Siang Peserta & Booth', qty: 240, satuan: 'box', hargaSatuan: 25000.00, subtotal: 6000000.00 },
    ]
  });

  const txOMK2025Out = await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-OUT-20251005-001`,
      transactionDate: new Date('2025-10-05T10:00:00Z'),
      transactionType: 'EXPENSE',
      fundCategoryId: omkFund.id,
      expenseTypeId: etAtk!.id,
      budgetItemId: biOmk2025.id,
      permohonanAnggaranId: reqOMK2025.id,
      amount: 15000000.00,
      description: 'Pencairan Dana Job Fair & Pelatihan Kerja OMK',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      isUangMuka: false,
      status: 'SELESAI',
    }
  });

  const spjOMK2025 = await prisma.spj.create({
    data: {
      title: 'Laporan SPJ Job Fair OMK 2025',
      amount: 15000000.00,
      status: SpjStatus.VERIFIED,
      uploadedBy: komisiUser!.name,
      kegiatanId: kegOMK2025.id,
      permohonanAnggaranId: reqOMK2025.id,
      posDanaId: omkFund.id,
      cashTransactionId: txOMK2025Out.id,
      createdAt: new Date('2025-10-18T11:00:00Z'),
    }
  });
  await createSpjLampiran(spjOMK2025.id, 'NOTA', 'nota_partisi_booth.pdf', '/uploads/nota_belanja_dummy.pdf');

  // --- CASE 3: Perayaan Pekan Suci dan Paskah 2026 (Current - Liturgi - Completed) ---
  const kegPaskah2026 = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2026-001',
      namaKegiatan: 'Perayaan Pekan Suci dan Paskah 2026',
      deskripsiKegiatan: 'Rangkaian Misa Pekan Suci mulai dari Minggu Palma, Kamis Putih, Jumat Agung, Malam Paskah, dan Hari Raya Paskah.',
      tujuanKegiatan: 'Memfasilitasi peribadatan Pekan Suci bagi umat paroki secara aman dan khidmat.',
      kategoriKegiatan: KategoriKegiatan.LITURGI,
      komisiId: komisiLiturgi.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Gereja Utama & Tenda Luar',
      tanggalMulai: new Date('2026-04-02T17:00:00Z'),
      tanggalSelesai: new Date('2026-04-05T21:00:00Z'),
      jumlahPeserta: 2000,
      prioritas: PrioritasKegiatan.TINGGI,
      status: StatusKegiatan.SELESAI,
    }
  });

  const reqPaskah2026 = await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2026-001',
      kegiatanId: kegPaskah2026.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2026-03-01T09:00:00Z'),
      estimasiBiaya: 40000000.00,
      jumlahDiajukan: 40000000.00,
      commandLine: undefined, // ignored by db
      jumlahDisetujui: 40000000.00,
      posDanaId: liturgiFund.id,
      reviewedById: bendaharaUser!.id,
      approvedById: pastorUser!.id,
      catatanReview: 'Dana disetujui penuh dari plafon Perlengkapan Liturgi & Sakramen.',
      status: StatusPermohonanAnggaran.SELESAI,
    } as any
  });

  await prisma.permohonanAnggaranDetail.createMany({
    data: [
      { permohonanId: reqPaskah2026.id, uraian: 'Dekorasi Altar (Palem & Bunga Paskah)', qty: 1, satuan: 'pkg', hargaSatuan: 12000000.00, subtotal: 12000000.00 },
      { permohonanId: reqPaskah2026.id, uraian: 'Cetak Buku Panduan Umat Pekan Suci', qty: 2000, satuan: 'buku', hargaSatuan: 5000.00, subtotal: 10000000.00 },
      { permohonanId: reqPaskah2026.id, uraian: 'Lilin Paskah Utama & Lilin Umat', qty: 2000, satuan: 'pcs', hargaSatuan: 4000.00, subtotal: 8000000.00 },
      { permohonanId: reqPaskah2026.id, uraian: 'Konsumsi Rapat Pleno & Petugas Liturgi (4 Hari)', qty: 400, satuan: 'box', hargaSatuan: 25000.00, subtotal: 10000000.00 },
    ]
  });

  await prisma.approvalHistory.createMany({
    data: [
      { step: 'Review Kegiatan', action: 'APPROVE', catatan: 'Diajukan oleh Komisi Liturgi untuk Paskah 2026.', tanggal: new Date('2026-03-01T10:00:00Z'), picId: komisiUser!.id, kegiatanId: kegPaskah2026.id },
      { step: 'Review Anggaran', action: 'APPROVE', catatan: 'Anggaran disetujui. Tersedia di plafon Perlengkapan.', tanggal: new Date('2026-03-03T14:00:00Z'), picId: bendaharaUser!.id, permohonanAnggaranId: reqPaskah2026.id },
      { step: 'Persetujuan Pastor', action: 'APPROVE', catatan: 'Disetujui. Koordinasikan dengan OMK untuk parkir.', tanggal: new Date('2026-03-05T09:30:00Z'), picId: pastorUser!.id, permohonanAnggaranId: reqPaskah2026.id },
    ]
  });

  const txPaskah2026Out = await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-OUT-20260320-001`,
      transactionDate: new Date('2026-03-20T10:00:00Z'),
      transactionType: 'EXPENSE',
      fundCategoryId: liturgiFund.id,
      expenseTypeId: etAtk!.id,
      budgetItemId: biLiturgiPerlengkapan2026.id,
      permohonanAnggaranId: reqPaskah2026.id,
      amount: 40000000.00,
      description: 'Pencairan Uang Muka Perayaan Pekan Suci dan Paskah 2026',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      isUangMuka: false,
      status: 'SELESAI',
    }
  });

  const spjPaskah2026 = await prisma.spj.create({
    data: {
      title: 'Laporan SPJ Pertanggungjawaban Paskah 2026',
      amount: 39900000.00,
      status: SpjStatus.VERIFIED,
      uploadedBy: komisiUser!.name,
      kegiatanId: kegPaskah2026.id,
      permohonanAnggaranId: reqPaskah2026.id,
      posDanaId: liturgiFund.id,
      cashTransactionId: txPaskah2026Out.id,
      createdAt: new Date('2026-04-12T10:00:00Z'),
    }
  });
  await createSpjLampiran(spjPaskah2026.id, 'NOTA', 'nota_dekorasi_altar_paskah.pdf', '/uploads/nota_belanja_dummy.pdf');
  await createSpjLampiran(spjPaskah2026.id, 'KWITANSI', 'nota_percetakan_buku.pdf', '/uploads/bukti_pembayaran_dummy.pdf');

  // Refund of 100,000
  await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-IN-20260413-001`,
      transactionDate: new Date('2026-04-13T11:00:00Z'),
      transactionType: 'INCOME',
      fundCategoryId: liturgiFund.id,
      incomeTypeId: itPersembahan!.id,
      amount: 100000.00,
      description: 'Pengembalian Sisa Dana Lebih Kegiatan Pekan Suci Paskah 2026',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      parentTransactionId: txPaskah2026Out.id,
    }
  });

  // --- CASE 4: Baksos Sembako Murah Hari Pangan Sedunia 2026 (Current - PSE - Completed) ---
  const kegBaksos2026 = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2026-002',
      namaKegiatan: 'Baksos Sembako Murah Hari Pangan Sedunia',
      deskripsiKegiatan: 'Pembagian sembako murah bersubsidi bagi 200 kepala keluarga prasejahtera di sekitar wilayah paroki.',
      tujuanKegiatan: 'Mewujudkan solidaritas sosial bagi keluarga prasejahtera dalam rangka Hari Pangan.',
      kategoriKegiatan: KategoriKegiatan.SOSIAL,
      komisiId: komisiPSE.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Halaman Samping Gereja',
      tanggalMulai: new Date('2026-05-15T08:00:00Z'),
      tanggalSelesai: new Date('2026-05-15T15:00:00Z'),
      jumlahPeserta: 200,
      prioritas: PrioritasKegiatan.SEDANG,
      status: StatusKegiatan.SELESAI,
    }
  });

  const reqBaksos2026 = await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2026-002',
      kegiatanId: kegBaksos2026.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2026-04-10T10:00:00Z'),
      estimasiBiaya: 25000000.00,
      commandLine: undefined, // ignored by db
      jumlahDiajukan: 25000000.00,
      jumlahDisetujui: 25000000.00,
      posDanaId: pseFund.id,
      reviewedById: bendaharaUser!.id,
      approvedById: pastorUser!.id,
      status: StatusPermohonanAnggaran.SELESAI,
    } as any
  });

  await prisma.permohonanAnggaranDetail.createMany({
    data: [
      { permohonanId: reqBaksos2026.id, uraian: 'Beras Pandan Wangi 5kg', qty: 200, satuan: 'pax', hargaSatuan: 65000.00, subtotal: 13000000.00 },
      { permohonanId: reqBaksos2026.id, uraian: 'Minyak Goreng Sania 1 Liter', qty: 200, satuan: 'pouch', hargaSatuan: 16000.00, subtotal: 3200000.00 },
      { permohonanId: reqBaksos2026.id, uraian: 'Gula Pasir Gulaku 1kg', qty: 200, satuan: 'pax', hargaSatuan: 17000.00, subtotal: 3400000.00 },
      { permohonanId: reqBaksos2026.id, uraian: 'Mie Instan Indomie Goreng (Karton)', qty: 25, satuan: 'dus', hargaSatuan: 108000.00, subtotal: 2700000.00 },
      { permohonanId: reqBaksos2026.id, uraian: 'Biaya Distribusi & Plastik Spunbound', qty: 1, satuan: 'ls', hargaSatuan: 2700000.00, subtotal: 2700000.00 },
    ]
  });

  const txBaksos2026Out = await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-OUT-20260510-001`,
      transactionDate: new Date('2026-05-10T10:00:00Z'),
      transactionType: 'EXPENSE',
      fundCategoryId: pseFund.id,
      expenseTypeId: etAtk!.id, // using ATK for placeholder expense type
      budgetItemId: biPseSembako2026.id,
      permohonanAnggaranId: reqBaksos2026.id,
      amount: 25000000.00,
      description: 'Pencairan Dana Belanja Sembako Baksos PSE',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      isUangMuka: false,
      status: 'SELESAI',
    }
  });

  const spjBaksos2026 = await prisma.spj.create({
    data: {
      title: 'Laporan SPJ Baksos Sembako Murah',
      amount: 25000000.00,
      status: SpjStatus.VERIFIED,
      uploadedBy: komisiUser!.name,
      kegiatanId: kegBaksos2026.id,
      permohonanAnggaranId: reqBaksos2026.id,
      posDanaId: pseFund.id,
      cashTransactionId: txBaksos2026Out.id,
      createdAt: new Date('2026-05-20T11:00:00Z'),
    }
  });
  await createSpjLampiran(spjBaksos2026.id, 'NOTA', 'nota_belanja_sembako_indogrosir.pdf', '/uploads/nota_belanja_dummy.pdf');

  // --- CASE 5: Misa Wilayah Akbar & Sakramen Krisma (Current - Liturgi - Awaiting SPJ) ---
  const kegKrisma2026 = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2026-003',
      namaKegiatan: 'Misa Wilayah Akbar & Sakramen Krisma',
      deskripsiKegiatan: 'Pelaksanaan Misa akbar di wilayah pastoral luar paroki sekaligus penerimaan sakramen krisma oleh Bapak Uskup bagi 80 calon krisma.',
      tujuanKegiatan: 'Memberikan pelayanan Sakramen Krisma dan mempererat persaudaraan antar umat wilayah.',
      kategoriKegiatan: KategoriKegiatan.LITURGI,
      komisiId: komisiLiturgi.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Lapangan Serbaguna Wilayah Utara',
      tanggalMulai: new Date('2026-06-10T15:00:00Z'),
      tanggalSelesai: new Date('2026-06-10T20:00:00Z'),
      jumlahPeserta: 600,
      prioritas: PrioritasKegiatan.TINGGI,
      status: StatusKegiatan.SELESAI,
    }
  });

  const reqKrisma2026 = await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2026-003',
      kegiatanId: kegKrisma2026.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2026-05-20T09:00:00Z'),
      estimasiBiaya: 35000000.00,
      jumlahDiajukan: 35000000.00,
      commandLine: undefined, // ignored by db
      jumlahDisetujui: 35000000.00,
      posDanaId: liturgiFund.id,
      reviewedById: bendaharaUser!.id,
      approvedById: pastorUser!.id,
      status: StatusPermohonanAnggaran.DICAIRKAN,
    } as any
  });

  await prisma.permohonanAnggaranDetail.createMany({
    data: [
      { permohonanId: reqKrisma2026.id, uraian: 'Sewa Tenda Besar & 500 Kursi Lipat', qty: 1, satuan: 'pkg', hargaSatuan: 12000000.00, subtotal: 12000000.00 },
      { permohonanId: reqKrisma2026.id, uraian: 'Konsumsi Box Nasi Umat & Panitia', qty: 500, satuan: 'box', hargaSatuan: 30000.00, subtotal: 15000000.00 },
      { permohonanId: reqKrisma2026.id, uraian: 'Sewa Sound System Lapangan & Genset 15KVA', qty: 1, satuan: 'hari', hargaSatuan: 5000000.00, subtotal: 5000000.00 },
      { permohonanId: reqKrisma2026.id, uraian: 'Stola Krisma & Cetak Sertifikat', qty: 80, satuan: 'set', hargaSatuan: 37500.00, subtotal: 3000000.00 },
    ]
  });

  const txKrisma2026Out = await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-OUT-20260605-001`,
      transactionDate: new Date('2026-06-05T10:00:00Z'),
      transactionType: 'EXPENSE',
      fundCategoryId: liturgiFund.id,
      expenseTypeId: etAtk!.id,
      budgetItemId: biLiturgiPerlengkapan2026.id,
      permohonanAnggaranId: reqKrisma2026.id,
      amount: 35000000.00,
      description: 'Pencairan Uang Muka Kegiatan Misa Krisma Wilayah',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      isUangMuka: true,
      status: 'MENUNGGU_SPJ',
    }
  });

  // Create SPJ pending verification (uploaded June 15, 2026)
  const spjKrisma2026 = await prisma.spj.create({
    data: {
      title: 'Laporan SPJ Misa Krisma Wilayah 2026',
      amount: 35000000.00,
      status: SpjStatus.PENDING,
      uploadedBy: komisiUser!.name,
      kegiatanId: kegKrisma2026.id,
      permohonanAnggaranId: reqKrisma2026.id,
      posDanaId: liturgiFund.id,
      cashTransactionId: txKrisma2026Out.id,
      createdAt: new Date('2026-06-15T15:00:00Z'),
    }
  });
  await createSpjLampiran(spjKrisma2026.id, 'NOTA', 'nota_sewa_tenda_utara.pdf', '/uploads/nota_belanja_dummy.pdf');

  // --- CASE 6: Retret Kepemimpinan Orang Muda Katolik (OMK) 2026 (Current - OMK - Approved) ---
  const kegRetretOMK2026 = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2026-004',
      namaKegiatan: 'Retret Kepemimpinan OMK Paroki 2026',
      deskripsiKegiatan: 'Kegiatan pembinaan iman, karakter, dan kepemimpinan bagi pengurus inti OMK paroki dan wilayah luar.',
      tujuanKegiatan: 'Melahirkan kader kepemimpinan OMK yang militan dan berkarakter pelayanan.',
      kategoriKegiatan: KategoriKegiatan.OMK,
      komisiId: komisiOMK.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Rumah Retret Santa Maria, Bandungan',
      tanggalMulai: new Date('2026-06-25T09:00:00Z'),
      tanggalSelesai: new Date('2026-06-27T15:00:00Z'),
      jumlahPeserta: 40,
      prioritas: PrioritasKegiatan.SEDANG,
      status: StatusKegiatan.DISETUJUI,
    }
  });

  const reqRetretOMK2026 = await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2026-004',
      kegiatanId: kegRetretOMK2026.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2026-06-01T10:00:00Z'),
      estimasiBiaya: 20000000.00,
      jumlahDiajukan: 20000000.00,
      commandLine: undefined, // ignored by db
      jumlahDisetujui: 20000000.00,
      posDanaId: omkFund.id,
      reviewedById: bendaharaUser!.id,
      approvedById: pastorUser!.id,
      catatanReview: 'Anggaran sesuai plafon tahun berjalan. Silakan diproses uang mukanya menjelang acara.',
      status: StatusPermohonanAnggaran.DISETUJUI,
    } as any
  });

  await prisma.permohonanAnggaranDetail.createMany({
    data: [
      { permohonanId: reqRetretOMK2026.id, uraian: 'Sewa Kamar & Aula Rumah Retret (3 hari 2 malam)', qty: 1, satuan: 'pkg', hargaSatuan: 8000000.00, subtotal: 8000000.00 },
      { permohonanId: reqRetretOMK2026.id, uraian: 'Konsumsi Peserta & Panitia (6x makan)', qty: 40, satuan: 'pax', hargaSatuan: 200000.00, subtotal: 8000000.00 },
      { permohonanId: reqRetretOMK2026.id, uraian: 'Buku Panduan, Lilin, ATK & Perlengkapan Outbound', qty: 1, satuan: 'pkg', hargaSatuan: 2000000.00, subtotal: 2000000.00 },
      { permohonanId: reqRetretOMK2026.id, uraian: 'Uang Bensin & Tol Bus Paroki', qty: 2, satuan: 'unit', hargaSatuan: 1000000.00, subtotal: 2000000.00 },
    ]
  });

  await prisma.approvalHistory.createMany({
    data: [
      { step: 'Review Kegiatan', action: 'APPROVE', catatan: 'Diajukan oleh komisi kepemudaan.', tanggal: new Date('2026-06-01T11:00:00Z'), picId: komisiUser!.id, kegiatanId: kegRetretOMK2026.id },
      { step: 'Review Anggaran', action: 'APPROVE', catatan: 'Plafon dana OMK mencukupi. Direkomendasikan persetujuan.', tanggal: new Date('2026-06-03T15:00:00Z'), picId: bendaharaUser!.id, permohonanAnggaranId: reqRetretOMK2026.id },
      { step: 'Persetujuan Pastor', action: 'APPROVE', catatan: 'Disetujui. Selamat membina OMK paroki.', tanggal: new Date('2026-06-05T10:00:00Z'), picId: pastorUser!.id, permohonanAnggaranId: reqRetretOMK2026.id },
    ]
  });

  // --- CASE 7: Renovasi Toilet Kompleks Gua Maria Paroki (Current - Pemeliharaan - Awaiting SPJ) ---
  const kegRenovToilet = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2026-005',
      namaKegiatan: 'Renovasi Toilet Kompleks Gua Maria Paroki',
      deskripsiKegiatan: 'Pekerjaan renovasi toilet umum kompleks peziarahan Gua Maria paroki yang rusak parah dan tersumbat.',
      tujuanKegiatan: 'Menjaga kebersihan lingkungan Gua Maria dan kenyamanan para peziarah luar wilayah.',
      kategoriKegiatan: KategoriKegiatan.PEMELIHARAAN,
      komisiId: komisiSarpras.id,
      pemohonId: pembangunanUser!.id, // Tim Pembangunan
      lokasi: 'Kompleks Peziarahan Gua Maria Paroki',
      tanggalMulai: new Date('2026-06-01T08:00:00Z'),
      tanggalSelesai: new Date('2026-06-15T17:00:00Z'),
      jumlahPeserta: 5,
      prioritas: PrioritasKegiatan.TINGGI,
      status: StatusKegiatan.SELESAI,
    }
  });

  const reqRenovToilet = await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2026-005',
      kegiatanId: kegRenovToilet.id,
      pemohonId: pembangunanUser!.id,
      tanggalPermohonan: new Date('2026-05-20T10:00:00Z'),
      estimasiBiaya: 45000000.00,
      jumlahDiajukan: 45000000.00,
      commandLine: undefined, // ignored by db
      jumlahDisetujui: 45000000.00,
      posDanaId: pemeliharaanFund.id,
      reviewedById: bendaharaUser!.id,
      approvedById: pastorUser!.id,
      status: StatusPermohonanAnggaran.DICAIRKAN,
    } as any
  });

  await prisma.permohonanAnggaranDetail.createMany({
    data: [
      { permohonanId: reqRenovToilet.id, uraian: 'Material Bangunan (Semen, Pasir, Batu Bata, Keramik Aladin)', qty: 1, satuan: 'pkg', hargaSatuan: 25000000.00, subtotal: 25000000.00 },
      { permohonanId: reqRenovToilet.id, uraian: 'Upah Tukang & Pekerja Harian (2 Minggu)', qty: 3, satuan: 'org', hargaSatuan: 5000000.00, subtotal: 15000000.00 },
      { permohonanId: reqRenovToilet.id, uraian: 'Pembelian 2 Unit Kloset Duduk Toto & Pipa Pralon', qty: 1, satuan: 'pkg', hargaSatuan: 5000000.00, subtotal: 5000000.00 },
    ]
  });

  const txRenovToiletOut = await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-OUT-20260528-001`,
      transactionDate: new Date('2026-05-28T09:00:00Z'),
      transactionType: 'EXPENSE',
      fundCategoryId: pemeliharaanFund.id,
      expenseTypeId: etMaterial!.id,
      budgetItemId: biPemeliharaanGedung2026.id,
      permohonanAnggaranId: reqRenovToilet.id,
      amount: 45000000.00,
      description: 'Pencairan Uang Muka Renovasi Toilet Peziarahan Gua Maria',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      isUangMuka: true,
      status: 'MENUNGGU_SPJ',
    }
  });

  // Create SPJ pending verification (uploaded June 16, 2026)
  const spjRenovToilet = await prisma.spj.create({
    data: {
      title: 'Laporan Pertanggungjawaban Pekerjaan Toilet Gua Maria',
      amount: 45200000.00, // overspend Rp 200,000
      status: SpjStatus.PENDING,
      uploadedBy: pembangunanUser!.name,
      kegiatanId: kegRenovToilet.id,
      permohonanAnggaranId: reqRenovToilet.id,
      posDanaId: pemeliharaanFund.id,
      cashTransactionId: txRenovToiletOut.id,
      createdAt: new Date('2026-06-16T10:00:00Z'),
    }
  });
  await createSpjLampiran(spjRenovToilet.id, 'NOTA', 'nota_belanja_material_gua_maria.pdf', '/uploads/nota_belanja_dummy.pdf');

  // --- CASE 8: Aksi Sosial Lingkungan Hidup (Current - OMK - Under Review) ---
  const kegAksiSosialLH = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2026-006',
      namaKegiatan: 'Aksi Sosial Lingkungan Hidup Penanaman Bibit',
      deskripsiKegiatan: 'Kegiatan penanaman 200 pohon pelindung dan tanaman hias di lingkungan paroki dan bantaran sungai sekitar.',
      tujuanKegiatan: 'Menjaga kelestarian alam dan membangun kepedulian ekologis OMK paroki.',
      kategoriKegiatan: KategoriKegiatan.OMK,
      komisiId: komisiOMK.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Bantaran Sungai Kali Code & Halaman Gereja',
      tanggalMulai: new Date('2026-07-12T07:30:00Z'),
      tanggalSelesai: new Date('2026-07-12T13:00:00Z'),
      jumlahPeserta: 80,
      prioritas: PrioritasKegiatan.RENDAH,
      status: StatusKegiatan.DIAJUKAN,
    }
  });

  await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2026-006',
      kegiatanId: kegAksiSosialLH.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2026-06-12T09:00:00Z'),
      estimasiBiaya: 5000000.00,
      jumlahDiajukan: 5000000.00,
      commandLine: undefined, // ignored by db
      jumlahDisetujui: 0.00,
      posDanaId: omkFund.id,
      status: StatusPermohonanAnggaran.DIREVIEW_BENDAHARA,
    } as any
  });

  // --- CASE 9: Pengadaan AC Baru Aula Utama Paroki (Current - Pemeliharaan - Rejected) ---
  const kegPengadaanAC = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2026-007',
      namaKegiatan: 'Pengadaan AC Baru Aula Utama Paroki',
      deskripsiKegiatan: 'Pembelian dan pemasangan 4 unit AC tipe Daikin 2 PK untuk ruang utama aula paroki.',
      tujuanKegiatan: 'Meningkatkan kenyamanan aula paroki untuk kegiatan rapat umat dan penyewaan.',
      kategoriKegiatan: KategoriKegiatan.PEMELIHARAAN,
      komisiId: komisiSarpras.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Aula Utama Lantai 2',
      tanggalMulai: new Date('2026-05-20T09:00:00Z'),
      tanggalSelesai: new Date('2026-05-21T17:00:00Z'),
      jumlahPeserta: 2,
      prioritas: PrioritasKegiatan.RENDAH,
      status: StatusKegiatan.DITOLAK,
      catatanReview: 'Ditolak karena AC aula utama masih bisa diservis. Prioritas tahun ini dialihkan untuk penanganan kebocoran toilet dan talang atap.',
    }
  });

  const reqPengadaanAC = await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2026-007',
      kegiatanId: kegPengadaanAC.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2026-05-01T10:00:00Z'),
      estimasiBiaya: 35000000.00,
      jumlahDiajukan: 35000000.00,
      commandLine: undefined, // ignored by db
      jumlahDisetujui: 0.00,
      posDanaId: pemeliharaanFund.id,
      reviewedById: bendaharaUser!.id,
      approvedById: pastorUser!.id,
      catatanReview: 'Ditolak. Servis AC yang lama terlebih dahulu. Pengeluaran harus ditekan.',
      status: StatusPermohonanAnggaran.DITOLAK,
    } as any
  });

  await prisma.permohonanAnggaranDetail.createMany({
    data: [
      { permohonanId: reqPengadaanAC.id, uraian: 'AC Daikin Split Wall 2 PK Standard', qty: 4, satuan: 'unit', hargaSatuan: 8000000.00, subtotal: 32000000.00 },
      { permohonanId: reqPengadaanAC.id, uraian: 'Jasa Pasang AC, Bobok & Pipa 5 meter per unit', qty: 4, satuan: 'unit', hargaSatuan: 750000.00, subtotal: 3000000.00 },
    ]
  });

  await prisma.approvalHistory.createMany({
    data: [
      { step: 'Review Kegiatan', action: 'SUBMIT', catatan: 'Diajukan untuk kenyamanan aula.', tanggal: new Date('2026-05-01T11:00:00Z'), picId: komisiUser!.id, kegiatanId: kegPengadaanAC.id },
      { step: 'Review Anggaran', action: 'REJECT', catatan: 'Plafon pemeliharaan menipis, disarankan ditolak.', tanggal: new Date('2026-05-03T14:30:00Z'), picId: bendaharaUser!.id, permohonanAnggaranId: reqPengadaanAC.id },
      { step: 'Persetujuan Pastor', action: 'REJECT', catatan: 'Ditolak. Lakukan efisiensi.', tanggal: new Date('2026-05-05T09:00:00Z'), picId: pastorUser!.id, permohonanAnggaranId: reqPengadaanAC.id },
    ]
  });

  // --- CASE 10: Program Beasiswa Sekolah Anak Paroki Kurang Mampu (Current - Pendidikan - Completed) ---
  const kegBeasiswa = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2026-008',
      namaKegiatan: 'Program Beasiswa Pendidikan Tahap I 2026',
      deskripsiKegiatan: 'Pemberian bantuan SPP sekolah bagi 10 anak sekolah dari keluarga prasejahtera yang berprestasi.',
      tujuanKegiatan: 'Mencegah putus sekolah di kalangan keluarga prasejahtera paroki.',
      kategoriKegiatan: KategoriKegiatan.PENDIDIKAN,
      komisiId: komisiKateketik.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Sekretariat Paroki',
      tanggalMulai: new Date('2026-01-15T09:00:00Z'),
      tanggalSelesai: new Date('2026-01-15T12:00:00Z'),
      jumlahPeserta: 10,
      prioritas: PrioritasKegiatan.TINGGI,
      status: StatusKegiatan.SELESAI,
    }
  });

  const reqBeasiswa = await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2026-008',
      kegiatanId: kegBeasiswa.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2026-01-05T10:00:00Z'),
      estimasiBiaya: 12000000.00,
      commandLine: undefined, // ignored by db
      jumlahDiajukan: 12000000.00,
      jumlahDisetujui: 12000000.00,
      posDanaId: pendidikanFund.id,
      reviewedById: bendaharaUser!.id,
      approvedById: pastorUser!.id,
      status: StatusPermohonanAnggaran.SELESAI,
    } as any
  });

  await prisma.permohonanAnggaranDetail.create({
    data: { permohonanId: reqBeasiswa.id, uraian: 'Bantuan Pembayaran Tunggakan SPP SD/SMP/SMA 10 Anak', qty: 10, satuan: 'org', hargaSatuan: 1200000.00, subtotal: 12000000.00 }
  });

  const txBeasiswaOut = await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-OUT-20260112-001`,
      transactionDate: new Date('2026-01-12T10:00:00Z'),
      transactionType: 'EXPENSE',
      fundCategoryId: pendidikanFund.id,
      expenseTypeId: etAtk!.id,
      budgetItemId: biPseBeasiswa2026.id, // linked to beasiswa
      permohonanAnggaranId: reqBeasiswa.id,
      amount: 12000000.00,
      description: 'Penyaluran Bantuan SPP Pendidikan Anak Paroki Kurang Mampu Tahap I',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      isUangMuka: false,
      status: 'SELESAI',
    }
  });

  const spjBeasiswa = await prisma.spj.create({
    data: {
      title: 'Laporan Bukti Transfer SPP Beasiswa Tahap I',
      amount: 12000000.00,
      status: SpjStatus.VERIFIED,
      uploadedBy: komisiUser!.name,
      kegiatanId: kegBeasiswa.id,
      permohonanAnggaranId: reqBeasiswa.id,
      posDanaId: pendidikanFund.id,
      cashTransactionId: txBeasiswaOut.id,
      createdAt: new Date('2026-01-20T14:00:00Z'),
    }
  });
  await createSpjLampiran(spjBeasiswa.id, 'KWITANSI', 'bukti_transfer_spp_sekolah.pdf', '/uploads/bukti_pembayaran_dummy.pdf');

  // --- CASE 11: Retret Calon Penerima Komuni Pertama (Current - Pendidikan - Completed) ---
  const kegKomuni = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2026-009',
      namaKegiatan: 'Retret & Pembekalan Komuni Pertama',
      deskripsiKegiatan: 'Retret 2 hari 1 malam untuk pembekalan rohani bagi 50 anak calon penerima komuni pertama paroki.',
      tujuanKegiatan: 'Mempersiapkan hati anak-anak dalam menyambut Tubuh Kristus pertama kali.',
      kategoriKegiatan: KategoriKegiatan.PENDIDIKAN,
      komisiId: komisiKateketik.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Panti Samadi Nazareth',
      tanggalMulai: new Date('2026-05-29T13:00:00Z'),
      tanggalSelesai: new Date('2026-05-30T17:00:00Z'),
      jumlahPeserta: 50,
      prioritas: PrioritasKegiatan.SEDANG,
      status: StatusKegiatan.SELESAI,
    }
  });

  const reqKomuni = await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2026-009',
      kegiatanId: kegKomuni.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2026-05-01T09:00:00Z'),
      estimasiBiaya: 10000000.00,
      commandLine: undefined, // ignored by db
      jumlahDiajukan: 10000000.00,
      commandLine2: undefined,
      jumlahDisetujui: 10000000.00,
      posDanaId: pendidikanFund.id,
      reviewedById: bendaharaUser!.id,
      approvedById: pastorUser!.id,
      status: StatusPermohonanAnggaran.SELESAI,
    } as any
  });

  await prisma.permohonanAnggaranDetail.createMany({
    data: [
      { permohonanId: reqKomuni.id, uraian: 'Sewa Penginapan Panti Samadi Nazareth', qty: 1, satuan: 'pkg', hargaSatuan: 3000000.00, subtotal: 3000000.00 },
      { permohonanId: reqKomuni.id, uraian: 'Paket Lilin Komuni Pertama & Buku Doa Katolik', qty: 50, satuan: 'set', hargaSatuan: 40000.00, subtotal: 2000000.00 },
      { permohonanId: reqKomuni.id, uraian: 'Konsumsi Nasi Box & Snak Selama Acara', qty: 1, satuan: 'pkg', hargaSatuan: 5000000.00, subtotal: 5000000.00 },
    ]
  });

  const txKomuniOut = await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-OUT-20260525-001`,
      transactionDate: new Date('2026-05-25T10:00:00Z'),
      transactionType: 'EXPENSE',
      fundCategoryId: pendidikanFund.id,
      expenseTypeId: etAtk!.id,
      budgetItemId: biPendidikanKomuni2026.id,
      permohonanAnggaranId: reqKomuni.id,
      amount: 10000000.00,
      description: 'Pencairan Dana Uang Muka Komuni Pertama 2026',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      isUangMuka: false,
      status: 'SELESAI',
    }
  });

  const spjKomuni = await prisma.spj.create({
    data: {
      title: 'Laporan SPJ Kegiatan Komuni Pertama 2026',
      amount: 9800000.00, // surplus 200K
      status: SpjStatus.VERIFIED,
      uploadedBy: komisiUser!.name,
      kegiatanId: kegKomuni.id,
      permohonanAnggaranId: reqKomuni.id,
      posDanaId: pendidikanFund.id,
      cashTransactionId: txKomuniOut.id,
      createdAt: new Date('2026-06-02T10:00:00Z'),
    }
  });
  await createSpjLampiran(spjKomuni.id, 'NOTA', 'nota_samadi_nazareth.pdf', '/uploads/nota_belanja_dummy.pdf');

  // Refund of 200,000
  await prisma.cashTransaction.create({
    data: {
      transactionNo: `TX-IN-20260603-001`,
      transactionDate: new Date('2026-06-03T11:00:00Z'),
      transactionType: 'INCOME',
      fundCategoryId: pendidikanFund.id,
      incomeTypeId: itPersembahan!.id,
      amount: 200000.00,
      description: 'Pengembalian Sisa Lebih Anggaran Komuni Pertama (Surplus SPJ)',
      createdById: bendaharaUser!.id,
      parokiId: paroki.id,
      parentTransactionId: txKomuniOut.id,
    }
  });

  // --- CASE 12: Misa Natal OMK & Gathering Kepemudaan (Future - OMK - Draft) ---
  const kegGatheringOMK = await prisma.pengajuanKegiatan.create({
    data: {
      nomorKegiatan: 'KEG-2026-010',
      namaKegiatan: 'Gathering & Misa Natal OMK Paroki 2026',
      deskripsiKegiatan: 'Gathering kebersamaan dan perayaan misa Natal khusus bagi OMK se-paroki di akhir tahun.',
      tujuanKegiatan: 'Mempererat tali kebersamaan pemuda paroki pasca Natal.',
      kategoriKegiatan: KategoriKegiatan.OMK,
      komisiId: komisiOMK.id,
      pemohonId: komisiUser!.id,
      lokasi: 'Aula Paroki Santo Yosef',
      tanggalMulai: new Date('2026-12-25T17:00:00Z'),
      tanggalSelesai: new Date('2026-12-25T22:00:00Z'),
      jumlahPeserta: 120,
      prioritas: PrioritasKegiatan.RENDAH,
      status: StatusKegiatan.DRAFT,
    }
  });

  await prisma.permohonanAnggaran.create({
    data: {
      nomorPermohonan: 'REQ-2026-010',
      kegiatanId: kegGatheringOMK.id,
      pemohonId: komisiUser!.id,
      tanggalPermohonan: new Date('2026-12-01T09:00:00Z'),
      estimasiBiaya: 15000000.00,
      jumlahDiajukan: 15000000.00,
      commandLine: undefined, // ignored by db
      jumlahDisetujui: 0.00,
      posDanaId: omkFund.id,
      status: StatusPermohonanAnggaran.DRAFT,
    } as any
  });

  console.log('✅ 12 Case Scenarios seeded successfully.');

  // 8. Generate Audit Logs for actions
  console.log('📝 Seeding Audit Logs...');
  const auditLogs = [
    { type: 'AUTH', action: 'User login berhasil - admin@santika.org', actorId: adminUser!.id, date: new Date('2026-06-19T08:00:00Z') },
    { type: 'APPROVE', action: 'Menyetujui Permohonan Anggaran REQ-2026-004 (Retret OMK)', actorId: pastorUser!.id, date: new Date('2026-06-05T10:00:00Z') },
    { type: 'OUT', action: 'Mencatat Kas Keluar Uang Muka Misa Krisma Wilayah senilai Rp 35.000.000', actorId: bendaharaUser!.id, date: new Date('2026-06-05T10:00:00Z') },
    { type: 'SPJ', action: 'Mengajukan dokumen SPJ Krisma Wilayah 2026', actorId: komisiUser!.id, date: new Date('2026-06-15T15:00:00Z') },
    { type: 'IN', action: 'Mencatat Penerimaan Kotak Pembangunan Wilayah Kapel senilai Rp 38.000.000', actorId: bendaharaUser!.id, date: new Date('2026-05-02T11:00:00Z') },
  ];

  for (const log of auditLogs) {
    await prisma.auditLog.create({
      data: {
        tanggal: log.date,
        type: log.type,
        action: log.action,
        actorId: log.actorId,
        parokiId: paroki.id,
      }
    });
  }

  console.log('🎉 Seeding successfully completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
