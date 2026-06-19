"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updatePasswordSchema = void 0;
const zod_1 = require("zod");
/**
 * Schema validasi untuk endpoint PUT /api/v1/profile/password.
 *
 * Kebijakan keamanan:
 * - oldPassword wajib dan minimal 6 karakter.
 * - newPassword wajib dan minimal 6 karakter.
 * - newPassword dan oldPassword tidak boleh identik (hindari no-op mutation).
 * - Semua validasi dilakukan di backend — frontend validation hanya untuk UX,
 *   bukan sebagai lapisan keamanan utama.
 */
exports.updatePasswordSchema = zod_1.z.object({
    body: zod_1.z
        .object({
        oldPassword: zod_1.z.string().min(6, 'Kata sandi lama harus minimal 6 karakter'),
        newPassword: zod_1.z.string().min(6, 'Kata sandi baru harus minimal 6 karakter'),
    })
        .refine((data) => data.oldPassword !== data.newPassword, {
        message: 'Kata sandi baru tidak boleh sama dengan kata sandi lama',
        path: ['newPassword'],
    }),
});
