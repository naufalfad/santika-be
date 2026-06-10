"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getApprovalsQuerySchema = exports.updateApprovalStatusSchema = exports.createPengajuanSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createPengajuanSchema = zod_1.z.object({
    body: zod_1.z.object({
        judul: zod_1.z.string().min(3, 'Judul must be at least 3 characters'),
        nominal: zod_1.z.number({ message: 'Nominal is required' }).min(1000, 'Nominal must be at least 1,000'),
        tujuan: zod_1.z.string().min(5, 'Tujuan must be at least 5 characters'),
        anggaranId: zod_1.z.string().uuid('Invalid Anggaran ID format'),
    }),
});
exports.updateApprovalStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid proposal ID format'),
    }),
    body: zod_1.z.object({
        action: zod_1.z.enum(['APPROVE', 'REJECT', 'REVISE', 'SUBMIT']),
        catatan: zod_1.z.string().optional(),
    }),
});
exports.getApprovalsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        status: zod_1.z.nativeEnum(client_1.ApprovalStatus).optional(),
        search: zod_1.z.string().optional(),
    }),
});
