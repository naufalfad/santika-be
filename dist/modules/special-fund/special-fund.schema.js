"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.allocateSpecialFundSchema = exports.updateSpecialFundSchema = exports.createSpecialFundSchema = void 0;
const zod_1 = require("zod");
exports.createSpecialFundSchema = zod_1.z.object({
    body: zod_1.z.object({
        code: zod_1.z
            .string({ message: 'Kode Dana Khusus harus diisi' })
            .min(2, 'Kode minimal 2 karakter')
            .toUpperCase(),
        name: zod_1.z
            .string({ message: 'Nama Dana Khusus harus diisi' })
            .min(2, 'Nama minimal 2 karakter'),
        description: zod_1.z.string().optional(),
        tujuanPenggalangan: zod_1.z.string().optional(),
        targetNominal: zod_1.z
            .preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), zod_1.z.number().nonnegative('Target nominal tidak boleh negatif'))
            .optional(),
        tanggalMulai: zod_1.z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), zod_1.z.date({ message: 'Tanggal mulai harus berupa format tanggal valid' })),
        tanggalSelesai: zod_1.z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), zod_1.z.date({ message: 'Tanggal selesai harus berupa format tanggal valid' })),
    }),
});
exports.updateSpecialFundSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid Special Fund ID format'),
    }),
    body: zod_1.z.object({
        code: zod_1.z
            .string()
            .min(2, 'Kode minimal 2 karakter')
            .toUpperCase()
            .optional(),
        name: zod_1.z.string().min(2, 'Nama minimal 2 karakter').optional(),
        description: zod_1.z.string().optional(),
        tujuanPenggalangan: zod_1.z.string().optional(),
        targetNominal: zod_1.z
            .preprocess((val) => (val === '' || val === null || val === undefined ? undefined : Number(val)), zod_1.z.number().nonnegative('Target nominal tidak boleh negatif'))
            .optional(),
        tanggalMulai: zod_1.z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), zod_1.z.date().optional()),
        tanggalSelesai: zod_1.z.preprocess((val) => (typeof val === 'string' ? new Date(val) : val), zod_1.z.date().optional()),
    }),
});
exports.allocateSpecialFundSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid Special Fund ID format'),
    }),
    body: zod_1.z.object({
        targetPosDanaId: zod_1.z.string().uuid('Format ID Pos Dana tidak valid'),
        nominal: zod_1.z.preprocess((val) => (typeof val === 'string' ? Number(val) : val), zod_1.z.number({ message: 'Nominal alokasi harus diisi' }).positive('Nominal alokasi harus lebih dari 0')),
        keterangan: zod_1.z.string().optional(),
    }),
});
