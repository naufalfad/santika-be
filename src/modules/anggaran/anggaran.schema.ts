import { z } from 'zod';

export const createAnggaranSchema = z.object({
  body: z.object({
    tahun: z
      .number({ message: 'Tahun is required' })
      .int()
      .positive('Tahun must be a positive integer'),
    fund_category_id: z.string().uuid('Invalid Fund Category ID format'),
    items: z
      .array(
        z.object({
          name: z.string().min(2, 'Name must be at least 2 characters'),
          plafon: z.number().positive('Plafon must be a positive number'),
          komisiId: z.string().uuid('Invalid Komisi ID format').optional().nullable(),
        })
      )
      .min(1, 'At least one budget item is required'),
  }),
});

export const updateAnggaranSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid budget ID format'),
  }),
  body: z.object({
    tahun: z
      .number()
      .int()
      .positive('Tahun must be a positive integer')
      .optional(),
    items: z
      .array(
        z.object({
          id: z.string().uuid('Invalid item ID format').optional(),
          name: z.string().min(2, 'Name must be at least 2 characters'),
          plafon: z.number().positive('Plafon must be a positive number'),
          komisiId: z.string().uuid('Invalid Komisi ID format').optional().nullable(),
        })
      )
      .optional(),
  }),
});

export const getAnggaranQuerySchema = z.object({
  query: z.object({
    tahun: z
      .string()
      .optional()
      .transform((val) => (val ? parseInt(val, 10) : undefined)),
    fund_category_id: z.string().uuid('Invalid Fund Category ID format').optional(),
  }),
});

export type CreateAnggaranInput = z.infer<typeof createAnggaranSchema>;
export type UpdateAnggaranInput = z.infer<typeof updateAnggaranSchema>;
export type GetAnggaranQueryInput = z.infer<typeof getAnggaranQuerySchema>;

