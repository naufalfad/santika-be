import { z } from 'zod';
import { ApprovalStatus } from '@prisma/client';

export const createPengajuanSchema = z.object({
  body: z.object({
    judul: z.string().min(3, 'Judul must be at least 3 characters'),
    nominal: z.number({ message: 'Nominal is required' }).min(1000, 'Nominal must be at least 1,000'),
    tujuan: z.string().min(5, 'Tujuan must be at least 5 characters'),
    anggaranId: z.string().uuid('Invalid Anggaran ID format'),
  }),
});

export const updateApprovalStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid proposal ID format'),
  }),
  body: z.object({
    action: z.enum(['APPROVE', 'REJECT', 'REVISE', 'SUBMIT']),
    catatan: z.string().optional(),
  }),
});

export const getApprovalsQuerySchema = z.object({
  query: z.object({
    status: z.nativeEnum(ApprovalStatus).optional(),
    search: z.string().optional(),
  }),
});

export type CreatePengajuanInput = z.infer<typeof createPengajuanSchema>;
export type UpdateApprovalStatusInput = z.infer<typeof updateApprovalStatusSchema>;
export type GetApprovalsQueryInput = z.infer<typeof getApprovalsQuerySchema>;
