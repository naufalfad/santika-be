import { z } from 'zod';

export const createFundCategorySchema = z.object({
  body: z.object({
    code: z
      .string({ message: 'Code is required' })
      .min(2, 'Code must be at least 2 characters')
      .toUpperCase(),
    name: z.string({ message: 'Name is required' }).min(2, 'Name must be at least 2 characters'),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const updateFundCategorySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid category ID format'),
  }),
  body: z.object({
    code: z
      .string()
      .min(2, 'Code must be at least 2 characters')
      .toUpperCase()
      .optional(),
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    description: z.string().optional(),
    isActive: z.boolean().optional(),
  }),
});

export const transferFundCategoryBalanceSchema = z.object({
  body: z.object({
    source_fund_category_id: z.string().uuid('Invalid source fund category ID format'),
    target_fund_category_id: z.string().uuid('Invalid target fund category ID format'),
    amount: z.number({ message: 'Amount is required' }).positive('Amount must be a positive number'),
    description: z.string().min(3, 'Description must be at least 3 characters'),
  }),
});

export type CreateFundCategoryInput = z.infer<typeof createFundCategorySchema>;
export type UpdateFundCategoryInput = z.infer<typeof updateFundCategorySchema>;
export type TransferFundCategoryBalanceInput = z.infer<typeof transferFundCategoryBalanceSchema>;
