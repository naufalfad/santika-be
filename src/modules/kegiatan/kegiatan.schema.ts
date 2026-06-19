import { z } from 'zod';
import { KategoriKegiatan, PrioritasKegiatan, StatusKegiatan } from '@prisma/client';

export const createKegiatanSchema = z.object({
  body: z.object({
    namaKegiatan: z.string().min(3, 'Nama kegiatan minimal 3 karakter'),
    deskripsiKegiatan: z.string().min(5, 'Deskripsi kegiatan minimal 5 karakter'),
    tujuanKegiatan: z.string().min(5, 'Tujuan kegiatan minimal 5 karakter'),
    kategoriKegiatan: z.nativeEnum(KategoriKegiatan, { message: 'Kategori kegiatan tidak valid' }),
    komisiId: z.string().uuid('ID Komisi tidak valid'),
    lokasi: z.string().min(3, 'Lokasi minimal 3 karakter'),
    tanggalMulai: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Tanggal mulai tidak valid' }),
    tanggalSelesai: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Tanggal selesai tidak valid' }),
    jumlahPeserta: z.coerce.number().min(1, 'Jumlah peserta minimal 1'),
    prioritas: z.nativeEnum(PrioritasKegiatan, { message: 'Prioritas tidak valid' }),
    status: z.nativeEnum(StatusKegiatan).optional(),
    totalAnggaran: z.coerce.number().min(0, 'Total anggaran minimal 0').optional().nullable(),
    posDanaId: z.string().uuid('ID Pos Dana tidak valid').optional().nullable(),
  }),
});

export const updateKegiatanStatusSchema = z.object({
  body: z.object({
    action: z.enum(['REVIEW', 'APPROVE', 'REJECT']),
    catatan: z.string().optional(),
    totalAnggaran: z.coerce.number().min(0).optional().nullable(),
    posDanaId: z.string().uuid().optional().nullable(),
  }),
});
