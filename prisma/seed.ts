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
  await prisma.pengajuan.deleteMany({});
  await prisma.kasKeluar.deleteMany({});
  await prisma.kasMasuk.deleteMany({});
  await prisma.cashTransaction.deleteMany({});
  await prisma.fundCategory.deleteMany({});
  await prisma.incomeType.deleteMany({});
  await prisma.expenseType.deleteMany({});
  await prisma.mutasiDanaKhusus.deleteMany({});
  await prisma.danaKhusus.deleteMany({});
  await prisma.anggaran.deleteMany({});
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

  console.log('📋 Created default Komisi records.');

  // 4. Create default Anggaran
  const tahunAnggaran = new Date().getFullYear();
  await prisma.anggaran.create({
    data: {
      tahun: tahunAnggaran,
      plafon: 50000000.00, // 50 Million
      terpakai: 0.00,
      sisa: 50000000.00,
      kategori: 'Liturgi',
      komisiId: komisiLiturgi.id,
      parokiId: paroki.id,
    },
  });

  await prisma.anggaran.create({
    data: {
      tahun: tahunAnggaran,
      plafon: 75000000.00, // 75 Million
      terpakai: 0.00,
      sisa: 75000000.00,
      kategori: 'Sosial',
      komisiId: komisiPSE.id,
      parokiId: paroki.id,
    },
  });

  console.log('💰 Created initial Anggaran limits.');

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
