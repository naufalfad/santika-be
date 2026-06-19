"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePermohonanAnggaranStatusSchema = exports.createPermohonanAnggaranSchema = void 0;
const zod_1 = require("zod");
exports.createPermohonanAnggaranSchema = zod_1.z.object({
    body: zod_1.z.object({
        kegiatanId: zod_1.z.string().uuid('ID Kegiatan tidak valid'),
        details: zod_1.z.array(zod_1.z.object({
            uraian: zod_1.z.string().min(3, 'Uraian rincian minimal 3 karakter'),
            qty: zod_1.z.coerce.number().min(1, 'Jumlah (qty) minimal 1'),
            satuan: zod_1.z.string().min(1, 'Satuan wajib diisi (misal: orang, paket)'),
            hargaSatuan: zod_1.z.coerce.number().min(1, 'Harga satuan minimal 1'),
            keterangan: zod_1.z.string().optional(),
        })).min(1, 'Harus ada minimal 1 rincian anggaran (RAB)'),
    }),
});
exports.updatePermohonanAnggaranStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        action: zod_1.z.enum(['REVIEW_BENDAHARA', 'APPROVE', 'REJECT', 'REVISE']),
        posDanaId: zod_1.z.string().uuid('ID Pos Dana tidak valid').optional(),
        jumlahDisetujui: zod_1.z.coerce.number().min(0).optional(),
        catatan: zod_1.z.string().optional(),
    }),
});
