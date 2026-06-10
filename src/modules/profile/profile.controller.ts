import { Request, Response, NextFunction } from 'express';
import path from 'path';
import { ProfileService } from './profile.service';

/**
 * ProfileController — HTTP Request Handler untuk Profil Mandiri.
 *
 * GRASP: Controller
 * ProfileController bertanggung jawab pada:
 * 1. Mengekstrak data dari HTTP request (userId dari JWT, file dari multer, body dari JSON).
 * 2. Mendelegasikan logika bisnis ke ProfileService.
 * 3. Memformat dan mengirimkan HTTP response yang konsisten.
 *
 * ProfileController TIDAK memiliki logika bisnis apa pun.
 * Semua keputusan domain (validasi hash, audit log) ada di ProfileService.
 */
export class ProfileController {
  /**
   * PATCH /api/v1/profile/avatar
   * Memperbarui foto profil pengguna yang sedang login.
   *
   * Middleware chain sebelum handler ini:
   *   authenticate → multerUpload.single('file') → handler
   *
   * File yang di-upload oleh multer tersedia di req.file.
   * URL avatar dikonstruksi dari BASE_URL server + path relatif uploads.
   */
  static async updateAvatar(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.file) {
        return res.status(400).json({
          status: 'error',
          statusCode: 400,
          message: 'File gambar avatar harus diunggah',
        });
      }

      const userId = req.user!.id;

      // Konstruksi URL avatar yang dapat diakses secara publik via endpoint /uploads/
      // Format: /uploads/file-1234567890.jpg
      const avatarUrl = `/uploads/${req.file.filename}`;

      const updatedUser = await ProfileService.updateAvatar(userId, avatarUrl);

      return res.status(200).json({
        status: 'success',
        message: 'Foto profil berhasil diperbarui',
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/profile/password
   * Memperbarui kata sandi pengguna yang sedang login.
   *
   * Middleware chain sebelum handler ini:
   *   authenticate → validateRequest(updatePasswordSchema) → handler
   *
   * Body yang sudah divalidasi Zod: { oldPassword, newPassword }
   */
  static async updatePassword(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const { oldPassword, newPassword } = req.body;

      const result = await ProfileService.updatePassword(
        userId,
        oldPassword,
        newPassword
      );

      return res.status(200).json({
        status: 'success',
        message: result.message,
        data: null,
      });
    } catch (error) {
      next(error);
    }
  }
}
