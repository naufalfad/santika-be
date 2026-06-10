import { z } from 'zod';

const KategoriKasMasuk = ['Kolekte', 'Donasi', 'Persembahan', 'Pembangunan', 'Lainnya'] as const;

export const createKasMasukSchema = z.object({
  body: z.object({
    tanggal: z.preprocess(
      (val) => (typeof val === 'string' ? new Date(val) : val),
      z.date({
        message: 'Invalid date format',
      })
    ),
    kategori: z.enum(KategoriKasMasuk, {
      message: `Kategori must be one of: ${KategoriKasMasuk.join(', ')}`,
    }),
    sumber: z.string().min(2, 'Sumber must be at least 2 characters'),
    jumlah: z.number({
      message: 'Jumlah is required',
    }).positive('Jumlah must be a positive number'),
    keterangan: z.string().optional(),
    status: z.string().optional().default('Selesai'),
  }),
});

export const updateKasMasukSchema = z.object({
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
    kategori: z.enum(KategoriKasMasuk, {
      message: `Kategori must be one of: ${KategoriKasMasuk.join(', ')}`,
    }).optional(),
    sumber: z.string().min(2, 'Sumber must be at least 2 characters').optional(),
    jumlah: z.number().positive('Jumlah must be a positive number').optional(),
    keterangan: z.string().optional(),
    status: z.string().optional(),
  }),
});

export const getKasMasukQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    kategori: z.string().optional(),
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

export type CreateKasMasukInput = z.infer<typeof createKasMasukSchema>;
export type UpdateKasMasukInput = z.infer<typeof updateKasMasukSchema>;
export type GetKasMasukQueryInput = z.infer<typeof getKasMasukQuerySchema>;
