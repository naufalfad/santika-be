"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAnggaranQuerySchema = exports.updateAnggaranSchema = exports.createAnggaranSchema = void 0;
const zod_1 = require("zod");
exports.createAnggaranSchema = zod_1.z.object({
    body: zod_1.z.object({
        tahun: zod_1.z
            .number({ message: 'Tahun is required' })
            .int()
            .positive('Tahun must be a positive integer'),
        fund_category_id: zod_1.z.string().uuid('Invalid Fund Category ID format'),
        items: zod_1.z
            .array(zod_1.z.object({
            name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
            plafon: zod_1.z.number().positive('Plafon must be a positive number'),
            komisiId: zod_1.z.string().uuid('Invalid Komisi ID format').optional().nullable(),
        }))
            .min(1, 'At least one budget item is required'),
    }),
});
exports.updateAnggaranSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid budget ID format'),
    }),
    body: zod_1.z.object({
        tahun: zod_1.z
            .number()
            .int()
            .positive('Tahun must be a positive integer')
            .optional(),
        items: zod_1.z
            .array(zod_1.z.object({
            id: zod_1.z.string().uuid('Invalid item ID format').optional(),
            name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
            plafon: zod_1.z.number().positive('Plafon must be a positive number'),
            komisiId: zod_1.z.string().uuid('Invalid Komisi ID format').optional().nullable(),
        }))
            .optional(),
    }),
});
exports.getAnggaranQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        tahun: zod_1.z
            .string()
            .optional()
            .transform((val) => (val ? parseInt(val, 10) : undefined)),
        fund_category_id: zod_1.z.string().uuid('Invalid Fund Category ID format').optional(),
    }),
});
