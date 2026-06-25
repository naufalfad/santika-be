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
    parent_transaction_id: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined || val === 'null' || val === 'undefined' ? undefined : val),
        z.string().uuid('Invalid parent transaction ID format')
      )
      .optional(),
    special_fund_id: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined || val === 'null' || val === 'undefined' ? undefined : val),
        z.string().uuid('Invalid special fund ID format')
      )
      .optional(),
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
    budget_item_id: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined || val === 'null' || val === 'undefined' ? undefined : val),
        z.string().uuid('Invalid budget item ID format')
      )
      .optional(),
    permohonan_anggaran_id: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined || val === 'null' || val === 'undefined' ? undefined : val),
        z.string().uuid('Invalid budget request (permohonan anggaran) ID format')
      )
      .optional(),
    is_uang_muka: z.preprocess(
      (val) => (val === 'true' || val === true),
      z.boolean().optional()
    ),
    amount: z.preprocess(
      (val) => (typeof val === 'string' ? Number(val) : val),
      z.number({ message: 'Amount is required' }).positive('Amount must be a positive number')
    ),
    description: z.string().min(3, 'Description must be at least 3 characters'),
    special_fund_id: z
      .preprocess(
        (val) => (val === '' || val === null || val === undefined || val === 'null' || val === 'undefined' ? undefined : val),
        z.string().uuid('Invalid special fund ID format')
      )
      .optional(),
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

export const auditTransactionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid transaction ID format'),
  }),
  body: z.object({
    status: z.enum(['TERVERIFIKASI', 'PERLU_KLARIFIKASI', 'TIDAK_VALID'], {
      message: 'Status must be TERVERIFIKASI, PERLU_KLARIFIKASI, or TIDAK_VALID',
    }),
    notes: z.string().optional(),
  }),
});

export type AuditTransactionInput = z.infer<typeof auditTransactionSchema>;
