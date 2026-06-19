"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSpjsQuerySchema = exports.updateSpjStatusSchema = exports.createSpjSchema = void 0;
const zod_1 = require("zod");
exports.createSpjSchema = zod_1.z.object({
    body: zod_1.z.object({
        title: zod_1.z.string().min(3, 'Judul SPJ minimal 3 karakter'),
        amount: zod_1.z.preprocess((val) => (typeof val === 'string' ? Number(val) : val), zod_1.z.number({ message: 'Amount is required' }).positive('Amount must be a positive number')),
        cash_transaction_id: zod_1.z.string().uuid('Invalid cash transaction ID format').optional(),
        kegiatan_id: zod_1.z.string().uuid('Invalid kegiatan ID format').optional(),
        permohonan_anggaran_id: zod_1.z.string().uuid('Invalid permohonan anggaran ID format').optional(),
    }),
});
exports.updateSpjStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.enum(['PENDING', 'VERIFIED', 'REJECTED']),
    }),
});
exports.getSpjsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string().optional(),
        status: zod_1.z.enum(['PENDING', 'VERIFIED', 'REJECTED']).optional(),
    }),
});
