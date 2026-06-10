import { z } from 'zod';

export const createAnggaranSchema = z.object({
  body: z.object({
    tahun: z
      .number({ message: 'Tahun is required' })
      .int()
      .positive('Tahun must be a positive integer'),
    plafon: z
      .number({ message: 'Plafon is required' })
      .positive('Plafon must be a positive number'),
    kategori: z.string().min(2, 'Kategori must be at least 2 characters'),
    komisiId: z.string().uuid('Invalid Komisi ID format'),
  }),
});

export const updateAnggaranSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid transaction ID format'),
  }),
  body: z.object({
    tahun: z
      .number()
      .int()
      .positive('Tahun must be a positive integer')
      .optional(),
    plafon: z
      .number()
      .positive('Plafon must be a positive number')
      .optional(),
    kategori: z.string().min(2, 'Kategori must be at least 2 characters').optional(),
    komisiId: z.string().uuid('Invalid Komisi ID format').optional(),
  }),
});

export const getAnggaranQuerySchema = z.object({
  query: z.object({
    tahun: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    komisiId: z.string().uuid('Invalid Komisi ID format').optional(),
  }),
});

export type CreateAnggaranInput = z.infer<typeof createAnggaranSchema>;
export type UpdateAnggaranInput = z.infer<typeof updateAnggaranSchema>;
export type GetAnggaranQueryInput = z.infer<typeof getAnggaranQuerySchema>;
