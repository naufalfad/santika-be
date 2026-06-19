import { z } from 'zod';

export const createSpjSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Judul SPJ minimal 3 karakter'),
    amount: z.preprocess(
      (val) => (typeof val === 'string' ? Number(val) : val),
      z.number({ message: 'Amount is required' }).positive('Amount must be a positive number')
    ),
    cash_transaction_id: z.string().uuid('Invalid cash transaction ID format').optional(),
    kegiatan_id: z.string().uuid('Invalid kegiatan ID format').optional(),
    permohonan_anggaran_id: z.string().uuid('Invalid permohonan anggaran ID format').optional(),
  }),
});

export const updateSpjStatusSchema = z.object({
  body: z.object({
    status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
  }),
});

export const getSpjsQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    status: z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
  }),
});

export type CreateSpjInput = z.infer<typeof createSpjSchema>;
export type UpdateSpjStatusInput = z.infer<typeof updateSpjStatusSchema>;
export type GetSpjsQueryInput = z.infer<typeof getSpjsQuerySchema>;
