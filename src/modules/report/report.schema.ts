import { z } from 'zod';

export const getReportQuerySchema = z.object({
  query: z.object({
    period: z
      .string()
      .regex(/^\d{4}-\d{2}$/, 'Format period harus YYYY-MM')
      .optional(),
    search: z.string().optional(),
  }),
});

export const getBudgetReportQuerySchema = z.object({
  query: z.object({
    year: z
      .string()
      .regex(/^\d{4}$/, 'Format tahun harus YYYY')
      .transform((val) => parseInt(val, 10))
      .optional(),
  }),
});

export type GetReportQueryInput = z.infer<typeof getReportQuerySchema>;
export type GetBudgetReportQueryInput = z.infer<typeof getBudgetReportQuerySchema>;
