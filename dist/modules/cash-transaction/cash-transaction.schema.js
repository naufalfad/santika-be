"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCashTransactionsQuerySchema = exports.createExpenseSchema = exports.createIncomeSchema = void 0;
const zod_1 = require("zod");
exports.createIncomeSchema = zod_1.z.object({
    body: zod_1.z.object({
        transaction_date: zod_1.z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), zod_1.z.date({ message: 'Invalid transaction date format' })),
        fund_category_id: zod_1.z.string().uuid('Invalid fund category ID format'),
        income_type_id: zod_1.z.string().uuid('Invalid income type ID format'),
        amount: zod_1.z.preprocess((val) => (typeof val === 'string' ? Number(val) : val), zod_1.z.number({ message: 'Amount is required' }).positive('Amount must be a positive number')),
        description: zod_1.z.string().min(3, 'Description must be at least 3 characters'),
    }),
});
exports.createExpenseSchema = zod_1.z.object({
    body: zod_1.z.object({
        transaction_date: zod_1.z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), zod_1.z.date({ message: 'Invalid transaction date format' })),
        fund_category_id: zod_1.z.string().uuid('Invalid fund category ID format'),
        expense_type_id: zod_1.z.string().uuid('Invalid expense type ID format'),
        amount: zod_1.z.preprocess((val) => (typeof val === 'string' ? Number(val) : val), zod_1.z.number({ message: 'Amount is required' }).positive('Amount must be a positive number')),
        description: zod_1.z.string().min(3, 'Description must be at least 3 characters'),
    }),
});
exports.getCashTransactionsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        fund_category_id: zod_1.z.string().uuid('Invalid fund category ID format').optional(),
        income_type_id: zod_1.z.string().uuid('Invalid income type ID format').optional(),
        expense_type_id: zod_1.z.string().uuid('Invalid expense type ID format').optional(),
        start_date: zod_1.z
            .string()
            .optional()
            .transform((val) => {
            if (!val)
                return undefined;
            const d = new Date(val);
            return isNaN(d.getTime()) ? undefined : d;
        }),
        end_date: zod_1.z
            .string()
            .optional()
            .transform((val) => {
            if (!val)
                return undefined;
            const d = new Date(val);
            return isNaN(d.getTime()) ? undefined : d;
        }),
        search: zod_1.z.string().optional(),
    }),
});
