import { z } from 'zod';

export const createSpecialFundSchema = z.object({
  body: z.object({
    code: z
      .string({ message: 'Kode Dana Khusus harus diisi' })
      .min(2, 'Kode minimal 2 karakter')
      .toUpperCase(),
    name: z
      .string({ message: 'Nama Dana Khusus harus diisi' })
      .min(2, 'Nama minimal 2 karakter'),
    description: z.string().optional(),
    tujuanPenggalangan: z.string().optional(),
    targetNominal: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
        z.number().nonnegative('Target nominal tidak boleh negatif')
      )
      .optional(),
    tanggalMulai: z.preprocess(
      (val) => (typeof val === 'string' ? new Date(val) : val),
      z.date({ message: 'Tanggal mulai harus berupa format tanggal valid' })
    ),
    tanggalSelesai: z.preprocess(
      (val) => (typeof val === 'string' ? new Date(val) : val),
      z.date({ message: 'Tanggal selesai harus berupa format tanggal valid' })
    ),
  }),
});

export const updateSpecialFundSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Special Fund ID format'),
  }),
  body: z.object({
    code: z
      .string()
      .min(2, 'Kode minimal 2 karakter')
      .toUpperCase()
      .optional(),
    name: z.string().min(2, 'Nama minimal 2 karakter').optional(),
    description: z.string().optional(),
    tujuanPenggalangan: z.string().optional(),
    targetNominal: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
        z.number().nonnegative('Target nominal tidak boleh negatif')
      )
      .optional(),
    tanggalMulai: z.preprocess(
      (val) => (typeof val === 'string' ? new Date(val) : val),
      z.date().optional()
    ),
    tanggalSelesai: z.preprocess(
      (val) => (typeof val === 'string' ? new Date(val) : val),
      z.date().optional()
    ),
  }),
});

export const allocateSpecialFundSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid Special Fund ID format'),
  }),
  body: z.object({
    targetPosDanaId: z.string().uuid('Format ID Pos Dana tidak valid'),
    nominal: z.preprocess(
      (val) => (typeof val === 'string' ? Number(val) : val),
      z.number({ message: 'Nominal alokasi harus diisi' }).positive('Nominal alokasi harus lebih dari 0')
    ),
    keterangan: z.string().optional(),
  }),
});

export type CreateSpecialFundInput = z.infer<typeof createSpecialFundSchema>;
export type UpdateSpecialFundInput = z.infer<typeof updateSpecialFundSchema>;
export type AllocateSpecialFundInput = z.infer<typeof allocateSpecialFundSchema>;
