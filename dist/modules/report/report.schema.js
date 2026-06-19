"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getBudgetReportQuerySchema = exports.getReportQuerySchema = void 0;
const zod_1 = require("zod");
exports.getReportQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        period: zod_1.z
            .string()
            .regex(/^\d{4}-\d{2}$/, 'Format period harus YYYY-MM')
            .optional(),
        search: zod_1.z.string().optional(),
    }),
});
exports.getBudgetReportQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        year: zod_1.z
            .string()
            .regex(/^\d{4}$/, 'Format tahun harus YYYY')
            .transform((val) => parseInt(val, 10))
            .optional(),
    }),
});
