import { z } from 'zod';

export const createIncomeSchema = z.object({
  body: z.object({
    transaction_date: z.preprocess(
      (val) => (typeof val === 'string' ? new Date(val) : val),
      z.date({ message: 'Invalid transaction date format' })
    ),
    fund_category_id: z.string().uuid('Invalid fund category ID format'),
    income_type_id: z.string().uuid('Invalid income type ID format'),
    amount: z.preprocess(
      (val) => (typeof val === 'string' ? Number(val) : val),
      z.number({ message: 'Amount is required' }).positive('Amount must be a positive number')
    ),
    description: z.string().min(3, 'Description must be at least 3 characters'),
  }),
});

export const createExpenseSchema = z.object({
  body: z.object({
    transaction_date: z.preprocess(
      (val) => (typeof val === 'string' ? new Date(val) : val),
      z.date({ message: 'Invalid transaction date format' })
    ),
    fund_category_id: z.string().uuid('Invalid fund category ID format'),
    expense_type_id: z.string().uuid('Invalid expense type ID format'),
    amount: z.preprocess(
      (val) => (typeof val === 'string' ? Number(val) : val),
      z.number({ message: 'Amount is required' }).positive('Amount must be a positive number')
    ),
    description: z.string().min(3, 'Description must be at least 3 characters'),
  }),
});

export const getCashTransactionsQuerySchema = z.object({
  query: z.object({
    fund_category_id: z.string().uuid('Invalid fund category ID format').optional(),
    income_type_id: z.string().uuid('Invalid income type ID format').optional(),
    expense_type_id: z.string().uuid('Invalid expense type ID format').optional(),
    start_date: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        const d = new Date(val);
        return isNaN(d.getTime()) ? undefined : d;
      }),
    end_date: z
      .string()
      .optional()
      .transform((val) => {
        if (!val) return undefined;
        const d = new Date(val);
        return isNaN(d.getTime()) ? undefined : d;
      }),
    search: z.string().optional(),
  }),
});

export type CreateIncomeInput = z.infer<typeof createIncomeSchema>;
export type CreateExpenseInput = z.infer<typeof createExpenseSchema>;
export type GetCashTransactionsQueryInput = z.infer<typeof getCashTransactionsQuerySchema>;
