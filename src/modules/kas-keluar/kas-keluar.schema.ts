import { z } from 'zod';

export const createKasKeluarSchema = z.object({
  body: z.object({
    tanggal: z.preprocess(
      (val) => (typeof val === 'string' ? new Date(val) : val),
      z.date({
        message: 'Invalid date format',
      })
    ),
    kategori: z.string().min(2, 'Kategori must be at least 2 characters'),
    penerima: z.string().min(2, 'Penerima must be at least 2 characters'),
    jumlah: z.preprocess(
      (val) => (typeof val === 'string' ? Number(val) : val),
      z.number({
        message: 'Jumlah must be a positive number',
      }).positive('Jumlah must be a positive number')
    ),
    anggaranId: z
      .preprocess(
        (val) => (val === '' || val === 'null' || val === 'undefined' ? undefined : val),
        z.string().uuid('Invalid Anggaran ID format')
      )
      .optional(),
  }),
});

export const updateKasKeluarSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid transaction ID format'),
  }),
  body: z.object({
    tanggal: z.preprocess(
      (val) => (typeof val === 'string' ? new Date(val) : val),
      z.date({
        message: 'Invalid date format',
      })
    ).optional(),
    kategori: z.string().min(2, 'Kategori must be at least 2 characters').optional(),
    penerima: z.string().min(2, 'Penerima must be at least 2 characters').optional(),
    jumlah: z.preprocess(
      (val) => (typeof val === 'string' ? Number(val) : val),
      z.number().positive('Jumlah must be a positive number')
    ).optional(),
    anggaranId: z
      .preprocess(
        (val) => (val === '' || val === 'null' || val === 'undefined' ? null : val),
        z.string().uuid('Invalid Anggaran ID format').nullable()
      )
      .optional(),
  }),
});

export const getKasKeluarQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    kategori: z.string().optional(),
    anggaranId: z.string().uuid('Invalid Anggaran ID format').optional(),
    startDate: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        const date = new Date(val);
        return isNaN(date.getTime()) ? undefined : date;
      }),
    endDate: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        const date = new Date(val);
        return isNaN(date.getTime()) ? undefined : date;
      }),
  }),
});

export type CreateKasKeluarInput = z.infer<typeof createKasKeluarSchema>;
export type UpdateKasKeluarInput = z.infer<typeof updateKasKeluarSchema>;
export type GetKasKeluarQueryInput = z.infer<typeof getKasKeluarQuerySchema>;
