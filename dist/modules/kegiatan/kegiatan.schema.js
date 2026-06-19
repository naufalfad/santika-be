"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateKegiatanStatusSchema = exports.createKegiatanSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createKegiatanSchema = zod_1.z.object({
    body: zod_1.z.object({
        namaKegiatan: zod_1.z.string().min(3, 'Nama kegiatan minimal 3 karakter'),
        deskripsiKegiatan: zod_1.z.string().min(5, 'Deskripsi kegiatan minimal 5 karakter'),
        tujuanKegiatan: zod_1.z.string().min(5, 'Tujuan kegiatan minimal 5 karakter'),
        kategoriKegiatan: zod_1.z.nativeEnum(client_1.KategoriKegiatan, { message: 'Kategori kegiatan tidak valid' }),
        komisiId: zod_1.z.string().uuid('ID Komisi tidak valid'),
        lokasi: zod_1.z.string().min(3, 'Lokasi minimal 3 karakter'),
        tanggalMulai: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Tanggal mulai tidak valid' }),
        tanggalSelesai: zod_1.z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Tanggal selesai tidak valid' }),
        jumlahPeserta: zod_1.z.coerce.number().min(1, 'Jumlah peserta minimal 1'),
        prioritas: zod_1.z.nativeEnum(client_1.PrioritasKegiatan, { message: 'Prioritas tidak valid' }),
        status: zod_1.z.nativeEnum(client_1.StatusKegiatan).optional(),
        totalAnggaran: zod_1.z.coerce.number().min(0, 'Total anggaran minimal 0').optional().nullable(),
        posDanaId: zod_1.z.string().uuid('ID Pos Dana tidak valid').optional().nullable(),
    }),
});
exports.updateKegiatanStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        action: zod_1.z.enum(['REVIEW', 'APPROVE', 'REJECT']),
        catatan: zod_1.z.string().optional(),
        totalAnggaran: zod_1.z.coerce.number().min(0).optional().nullable(),
        posDanaId: zod_1.z.string().uuid().optional().nullable(),
    }),
});
