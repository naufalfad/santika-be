"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getKasMasukQuerySchema = exports.updateKasMasukSchema = exports.createKasMasukSchema = void 0;
const zod_1 = require("zod");
const KategoriKasMasuk = ['Kolekte', 'Donasi', 'Persembahan', 'Pembangunan', 'Lainnya'];
exports.createKasMasukSchema = zod_1.z.object({
    body: zod_1.z.object({
        tanggal: zod_1.z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), zod_1.z.date({
            message: 'Invalid date format',
        })),
        kategori: zod_1.z.enum(KategoriKasMasuk, {
            message: `Kategori must be one of: ${KategoriKasMasuk.join(', ')}`,
        }),
        sumber: zod_1.z.string().min(2, 'Sumber must be at least 2 characters'),
        jumlah: zod_1.z.number({
            message: 'Jumlah is required',
        }).positive('Jumlah must be a positive number'),
        keterangan: zod_1.z.string().optional(),
        status: zod_1.z.string().optional().default('Selesai'),
    }),
});
exports.updateKasMasukSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid transaction ID format'),
    }),
    body: zod_1.z.object({
        tanggal: zod_1.z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), zod_1.z.date({
            message: 'Invalid date format',
        })).optional(),
        kategori: zod_1.z.enum(KategoriKasMasuk, {
            message: `Kategori must be one of: ${KategoriKasMasuk.join(', ')}`,
        }).optional(),
        sumber: zod_1.z.string().min(2, 'Sumber must be at least 2 characters').optional(),
        jumlah: zod_1.z.number().positive('Jumlah must be a positive number').optional(),
        keterangan: zod_1.z.string().optional(),
        status: zod_1.z.string().optional(),
    }),
});
exports.getKasMasukQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string().optional(),
        kategori: zod_1.z.string().optional(),
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
