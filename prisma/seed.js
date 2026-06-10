"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const pg_1 = require("pg");
const adapter_pg_1 = require("@prisma/adapter-pg");
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const pool = new pg_1.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new adapter_pg_1.PrismaPg(pool);
const prisma = new client_1.PrismaClient({ adapter });
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
    const hashedPassword = await bcryptjs_1.default.hash('password123', 10);
    // 6. Define users to create
    const usersToCreate = [
        {
            email: 'admin@santika.org',
            name: 'Super Admin Santika',
            role: client_1.Role.SUPER_ADMIN,
        },
        {
            email: 'pastor@santika.org',
            name: 'Romo Yohanes, Pr',
            role: client_1.Role.PASTOR,
        },
        {
            email: 'bendahara@santika.org',
            name: 'Ibu Maria Susanti',
            role: client_1.Role.BENDAHARA,
        },
        {
            email: 'dewan@santika.org',
            name: 'Bapak FX. Bambang',
            role: client_1.Role.DEWAN_KEUANGAN,
        },
        {
            email: 'komisi@santika.org',
            name: 'Bapak Ignatius Sutrisno',
            role: client_1.Role.KETUA_KOMISI,
        },
        {
            email: 'pembangunan@santika.org',
            name: 'Bapak Thomas Wijaya',
            role: client_1.Role.TIM_PEMBANGUNAN,
        },
        {
            email: 'sekretariat@santika.org',
            name: 'Sdri. Anastasia Eka',
            role: client_1.Role.SEKRETARIAT,
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
