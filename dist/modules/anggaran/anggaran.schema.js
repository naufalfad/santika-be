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
        plafon: zod_1.z
            .number({ message: 'Plafon is required' })
            .positive('Plafon must be a positive number'),
        kategori: zod_1.z.string().min(2, 'Kategori must be at least 2 characters'),
        komisiId: zod_1.z.string().uuid('Invalid Komisi ID format'),
    }),
});
exports.updateAnggaranSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid transaction ID format'),
    }),
    body: zod_1.z.object({
        tahun: zod_1.z
            .number()
            .int()
            .positive('Tahun must be a positive integer')
            .optional(),
        plafon: zod_1.z
            .number()
            .positive('Plafon must be a positive number')
            .optional(),
        kategori: zod_1.z.string().min(2, 'Kategori must be at least 2 characters').optional(),
        komisiId: zod_1.z.string().uuid('Invalid Komisi ID format').optional(),
    }),
});
exports.getAnggaranQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        tahun: zod_1.z
            .string()
            .optional()
            .transform((val) => (val ? parseInt(val, 10) : undefined)),
        komisiId: zod_1.z.string().uuid('Invalid Komisi ID format').optional(),
    }),
});
