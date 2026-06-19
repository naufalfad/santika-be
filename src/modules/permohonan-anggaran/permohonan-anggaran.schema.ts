import { z } from 'zod';

export const createPermohonanAnggaranSchema = z.object({
  body: z.object({
    kegiatanId: z.string().uuid('ID Kegiatan tidak valid'),
    details: z.array(
      z.object({
        uraian: z.string().min(3, 'Uraian rincian minimal 3 karakter'),
        qty: z.coerce.number().min(1, 'Jumlah (qty) minimal 1'),
        satuan: z.string().min(1, 'Satuan wajib diisi (misal: orang, paket)'),
        hargaSatuan: z.coerce.number().min(1, 'Harga satuan minimal 1'),
        keterangan: z.string().optional(),
      })
    ).min(1, 'Harus ada minimal 1 rincian anggaran (RAB)'),
  }),
});

export const updatePermohonanAnggaranStatusSchema = z.object({
  body: z.object({
    action: z.enum(['REVIEW_BENDAHARA', 'APPROVE', 'REJECT', 'REVISE']),
    posDanaId: z.string().uuid('ID Pos Dana tidak valid').optional(),
    jumlahDisetujui: z.coerce.number().min(0).optional(),
    catatan: z.string().optional(),
  }),
});
