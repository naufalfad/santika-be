"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProfileService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
/**
 * ProfileService — Business Logic untuk Manajemen Profil Mandiri.
 *
 * GRASP: Information Expert
 * ProfileService adalah satu-satunya objek yang berhak mengakses dan
 * memodifikasi data profil pengguna (avatarUrl, password). Ia memiliki
 * semua informasi yang dibutuhkan untuk melakukan operasi ini secara aman.
 *
 * KEBIJAKAN DATA INTEGRITY (Audit Trail Protection):
 * Field READ-ONLY yang TIDAK BOLEH dimodifikasi oleh service ini:
 *   - name     → pilar identitas di AuditLog.action dan ApprovalHistory
 *   - email    → unique identifier untuk login dan audit record
 *   - role     → RBAC gate untuk seluruh sistem otorisasi
 *   - parokiId → batas yurisdiksi data paroki
 *
 * Field EDITABLE yang BOLEH dimodifikasi oleh service ini:
 *   - avatarUrl → representasi visual, tidak memengaruhi audit trail
 *   - password  → autentikasi, diubah dengan verifikasi hash bcrypt
 */
class ProfileService {
    /**
     * Update URL avatar profil pengguna.
     * avatarUrl disimpan sebagai path relatif URL yang dapat diakses
     * melalui endpoint static `/uploads/` di Express.
     *
     * @param userId - ID pengguna yang sedang login (dari req.user.id)
     * @param avatarUrl - URL lengkap atau path relatif file avatar yang di-upload
     * @returns Objek user yang diperbarui (tanpa field password)
     */
    static async updateAvatar(userId, avatarUrl) {
        // Pastikan user exist sebelum update
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw api_error_1.ApiError.notFound('Akun pengguna tidak ditemukan');
        }
        if (!user.isActive) {
            throw api_error_1.ApiError.forbidden('Akun pengguna tidak aktif');
        }
        // Update hanya kolom avatarUrl — kolom lain tidak tersentuh
        const updatedUser = await database_1.prisma.user.update({
            where: { id: userId },
            data: { avatarUrl },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatarUrl: true,
                isActive: true,
                parokiId: true,
                createdAt: true,
                updatedAt: true,
                paroki: {
                    select: {
                        id: true,
                        nama: true,
                    },
                },
            },
        });
        // Catat perubahan avatar ke audit log untuk traceability
        await database_1.prisma.auditLog.create({
            data: {
                type: 'AUTH',
                action: `User ${updatedUser.name} memperbarui foto profil`,
                actorId: userId,
                parokiId: updatedUser.parokiId,
            },
        });
        return updatedUser;
    }
    /**
     * Ubah kata sandi pengguna dengan verifikasi bcrypt pada sandi lama.
     *
     * Alur keamanan:
     * 1. Ambil user beserta hash password dari DB.
     * 2. Bandingkan oldPassword dengan hash via bcrypt.compare().
     * 3. Jika tidak cocok → throw 400 Bad Request (pesan generik untuk hindari enumeration).
     * 4. Hash newPassword dengan bcrypt salt 12 (lebih kuat dari default 10).
     * 5. Update kolom password di DB.
     * 6. Catat ke audit log.
     *
     * @param userId    - ID pengguna yang sedang login
     * @param oldPassword - Kata sandi lama dalam plaintext (dari request body)
     * @param newPassword - Kata sandi baru dalam plaintext (dari request body)
     * @returns Object konfirmasi sukses (tidak mengembalikan data sensitif)
     */
    static async updatePassword(userId, oldPassword, newPassword) {
        // 1. Ambil user dengan password hash — field yang di-exclude di endpoint lain
        const user = await database_1.prisma.user.findUnique({
            where: { id: userId },
        });
        if (!user) {
            throw api_error_1.ApiError.notFound('Akun pengguna tidak ditemukan');
        }
        if (!user.isActive) {
            throw api_error_1.ApiError.forbidden('Akun pengguna tidak aktif');
        }
        // 2. Verifikasi kata sandi lama menggunakan bcrypt
        const isOldPasswordValid = await bcryptjs_1.default.compare(oldPassword, user.password);
        if (!isOldPasswordValid) {
            // Pesan generik: hindari memberikan informasi tentang validitas password lama
            throw api_error_1.ApiError.badRequest('Kata sandi lama yang Anda masukkan tidak sesuai');
        }
        // 3. Hash kata sandi baru dengan salt 12 (lebih kuat dari default 10)
        const hashedNewPassword = await bcryptjs_1.default.hash(newPassword, 12);
        // 4. Update hanya kolom password — kolom lain tidak tersentuh
        await database_1.prisma.user.update({
            where: { id: userId },
            data: { password: hashedNewPassword },
        });
        // 5. Catat ke audit log untuk keamanan
        await database_1.prisma.auditLog.create({
            data: {
                type: 'AUTH',
                action: `User ${user.name} mengubah kata sandi akun`,
                actorId: userId,
                parokiId: user.parokiId,
            },
        });
        return { message: 'Kata sandi berhasil diperbarui' };
    }
}
exports.ProfileService = ProfileService;
