import 'dotenv/config';
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('🌱 Starting database seeding...');

  // 1. Clean up existing data (optional, but good for idempotent runs)
  // Clean in order of dependencies
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
  console.log('✅ Seeded default Fund Categories.');

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
  console.log('✅ Seeded default Income Types.');

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
  console.log('✅ Seeded default Expense Types.');


  // 3. Create default Komisi
  const komisiLiturgi = await prisma.komisi.create({
    data: {
      nama: 'Komisi Liturgi',
      parokiId: paroki.id,
    },
  });
  
  const komisiPSE = await prisma.komisi.create({
    data: {
      nama: 'Komisi PSE (Pengembangan Sosial Ekonomi)',
      parokiId: paroki.id,
    },
  });

  const komisiOMK = await prisma.komisi.create({
    data: {
      nama: 'Komisi Kepemudaan (OMK)',
      parokiId: paroki.id,
    },
  });

  const komisiKateketik = await prisma.komisi.create({
    data: {
      nama: 'Komisi Kateketik (Pendidikan Iman)',
      parokiId: paroki.id,
    },
  });

  const komisiSarpras = await prisma.komisi.create({
    data: {
      nama: 'Bagian Sarana Prasarana (Pemeliharaan)',
      parokiId: paroki.id,
    },
  });

  console.log('📋 Created default Komisi records.');

  // 4. Create default Budget & Budget Items
  const tahunAnggaran = new Date().getFullYear();
  
  const dbFunds = await prisma.fundCategory.findMany({
    where: { parokiId: paroki.id },
  });

  const operasionalFund = dbFunds.find((f) => f.code === 'OPERASIONAL')!;
  const liturgiFund = dbFunds.find((f) => f.code === 'LITURGI')!;
  const pseFund = dbFunds.find((f) => f.code === 'PSE')!;
  const omkFund = dbFunds.find((f) => f.code === 'OMK')!;
  const pemeliharaanFund = dbFunds.find((f) => f.code === 'PEMELIHARAAN_ASET')!;
  const pendidikanFund = dbFunds.find((f) => f.code === 'PENDIDIKAN')!;

  // Budget for Liturgi
  const budgetLiturgi = await prisma.budget.create({
    data: {
      tahun: tahunAnggaran,
      fundCategoryId: liturgiFund.id,
      parokiId: paroki.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetLiturgi.id,
      name: 'Perlengkapan Liturgi & Sakramen',
      plafon: 40000000.00,
      komisiId: komisiLiturgi.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetLiturgi.id,
      name: 'Hias Altar Misa',
      plafon: 30000000.00,
      komisiId: komisiLiturgi.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetLiturgi.id,
      name: 'Pembinaan Lektor & Misdinar',
      plafon: 15000000.00,
      komisiId: komisiLiturgi.id,
    },
  });

  // Budget for PSE
  const budgetPSE = await prisma.budget.create({
    data: {
      tahun: tahunAnggaran,
      fundCategoryId: pseFund.id,
      parokiId: paroki.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetPSE.id,
      name: 'Bantuan Sembako Umat',
      plafon: 50000000.00,
      komisiId: komisiPSE.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetPSE.id,
      name: 'Beasiswa Anak Sekolah',
      plafon: 45000000.00,
      komisiId: komisiPSE.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetPSE.id,
      name: 'Bantuan Kesehatan Umat',
      plafon: 35000000.00,
      komisiId: komisiPSE.id,
    },
  });

  // Budget for OMK
  const budgetOMK = await prisma.budget.create({
    data: {
      tahun: tahunAnggaran,
      fundCategoryId: omkFund.id,
      parokiId: paroki.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetOMK.id,
      name: 'Kegiatan Paskah & Natal OMK',
      plafon: 20000000.00,
      komisiId: komisiOMK.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetOMK.id,
      name: 'Retret & Pembinaan Iman OMK',
      plafon: 25000000.00,
      komisiId: komisiOMK.id,
    },
  });

  // Budget for Operasional
  const budgetOperasional = await prisma.budget.create({
    data: {
      tahun: tahunAnggaran,
      fundCategoryId: operasionalFund.id,
      parokiId: paroki.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetOperasional.id,
      name: 'Gaji Karyawan & Koster',
      plafon: 60000000.00,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetOperasional.id,
      name: 'Listrik, Air & Internet',
      plafon: 36000000.00,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetOperasional.id,
      name: 'ATK & Rumah Tangga Pastoran',
      plafon: 24000000.00,
    },
  });

  // Budget for Pemeliharaan Aset
  const budgetPemeliharaan = await prisma.budget.create({
    data: {
      tahun: tahunAnggaran,
      fundCategoryId: pemeliharaanFund.id,
      parokiId: paroki.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetPemeliharaan.id,
      name: 'Pemeliharaan Gedung Gereja',
      plafon: 80000000.00,
      komisiId: komisiSarpras.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetPemeliharaan.id,
      name: 'Perawatan AC & Sound System',
      plafon: 30000000.00,
      komisiId: komisiSarpras.id,
    },
  });

  // Budget for Pendidikan
  const budgetPendidikan = await prisma.budget.create({
    data: {
      tahun: tahunAnggaran,
      fundCategoryId: pendidikanFund.id,
      parokiId: paroki.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetPendidikan.id,
      name: 'Pembinaan BIA & BIR',
      plafon: 15000000.00,
      komisiId: komisiKateketik.id,
    },
  });

  await prisma.budgetItem.create({
    data: {
      budgetId: budgetPendidikan.id,
      name: 'Persiapan Komuni Pertama',
      plafon: 12000000.00,
      komisiId: komisiKateketik.id,
    },
  });

  console.log('💰 Created initial Budget limits.');

  // 5. Hash password for users
  const hashedPassword = await bcrypt.hash('password123', 10);

  // 6. Define users to create
  const usersToCreate = [
    {
      email: 'admin@santika.org',
      name: 'Super Admin Santika',
      role: Role.SUPER_ADMIN,
    },
    {
      email: 'pastor@santika.org',
      name: 'Romo Yohanes, Pr',
      role: Role.PASTOR,
    },
    {
      email: 'bendahara@santika.org',
      name: 'Ibu Maria Susanti',
      role: Role.BENDAHARA,
    },
    {
      email: 'dewan@santika.org',
      name: 'Bapak FX. Bambang',
      role: Role.DEWAN_KEUANGAN,
    },
    {
      email: 'komisi@santika.org',
      name: 'Bapak Ignatius Sutrisno',
      role: Role.KETUA_KOMISI,
    },
    {
      email: 'pembangunan@santika.org',
      name: 'Bapak Thomas Wijaya',
      role: Role.TIM_PEMBANGUNAN,
    },
    {
      email: 'sekretariat@santika.org',
      name: 'Sdri. Anastasia Eka',
      role: Role.SEKRETARIAT,
    },
  ];

  for (const userData of usersToCreate) {
    const user = await prisma.user.create({
      data: {
        email: userData.email,
        name: userData.name,
        password: hashedPassword,
        role: userData.role,
        isActive: true,
        parokiId: paroki.id,
      },
    });
    console.log(`👤 Created User: ${user.name} (${user.role})`);
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
