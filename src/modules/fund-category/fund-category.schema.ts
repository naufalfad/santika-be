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

export type CreateFundCategoryInput = z.infer<typeof createFundCategorySchema>;
export type UpdateFundCategoryInput = z.infer<typeof updateFundCategorySchema>;
