"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKasKeluarQuerySchema = exports.updateKasKeluarSchema = exports.createKasKeluarSchema = void 0;
const zod_1 = require("zod");
exports.createKasKeluarSchema = zod_1.z.object({
    body: zod_1.z.object({
        tanggal: zod_1.z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), zod_1.z.date({
            message: 'Invalid date format',
        })),
        kategori: zod_1.z.string().min(2, 'Kategori must be at least 2 characters'),
        penerima: zod_1.z.string().min(2, 'Penerima must be at least 2 characters'),
        jumlah: zod_1.z.preprocess((val) => (typeof val === 'string' ? Number(val) : val), zod_1.z.number({
            message: 'Jumlah must be a positive number',
        }).positive('Jumlah must be a positive number')),
        anggaranId: zod_1.z
            .preprocess((val) => (val === '' || val === 'null' || val === 'undefined' ? undefined : val), zod_1.z.string().uuid('Invalid Anggaran ID format'))
            .optional(),
    }),
});
exports.updateKasKeluarSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid transaction ID format'),
    }),
    body: zod_1.z.object({
        tanggal: zod_1.z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), zod_1.z.date({
            message: 'Invalid date format',
        })).optional(),
        kategori: zod_1.z.string().min(2, 'Kategori must be at least 2 characters').optional(),
        penerima: zod_1.z.string().min(2, 'Penerima must be at least 2 characters').optional(),
        jumlah: zod_1.z.preprocess((val) => (typeof val === 'string' ? Number(val) : val), zod_1.z.number().positive('Jumlah must be a positive number')).optional(),
        anggaranId: zod_1.z
            .preprocess((val) => (val === '' || val === 'null' || val === 'undefined' ? null : val), zod_1.z.string().uuid('Invalid Anggaran ID format').nullable())
            .optional(),
    }),
});
exports.getKasKeluarQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string().optional(),
        kategori: zod_1.z.string().optional(),
        anggaranId: zod_1.z.string().uuid('Invalid Anggaran ID format').optional(),
        startDate: zod_1.z
            .string()
            .optional()
            .transform((val) => {
            if (!val)
                return undefined;
            const date = new Date(val);
            return isNaN(date.getTime()) ? undefined : date;
        }),
        endDate: zod_1.z
            .string()
            .optional()
            .transform((val) => {
            if (!val)
                return undefined;
            const date = new Date(val);
            return isNaN(date.getTime()) ? undefined : date;
        }),
    }),
});
