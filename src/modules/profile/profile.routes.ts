import { Router } from 'express';
import { ProfileController } from './profile.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { multerUpload } from '../../common/middleware/upload.middleware';
import { updatePasswordSchema } from './profile.schema';

/**
 * Profile Router — Endpoint Profil Mandiri.
 *
 * GRASP: Indirection
 * Router ini bertindak sebagai lapisan indirection antara HTTP routing
 * Express dan ProfileController. Semua rute di sini membutuhkan autentikasi
 * (authenticate middleware). Tidak ada otorisasi berbasis role (authorize)
 * karena semua role berhak mengelola profil dirinya sendiri.
 *
 * Middleware chain per endpoint:
 *
 * PATCH /avatar:
 *   authenticate           → Verifikasi JWT, inject req.user
 *   multerUpload.single()  → Parse multipart/form-data, simpan file ke /uploads/
 *   ProfileController      → Proses update avatarUrl di DB
 *
 * PUT /password:
 *   authenticate           → Verifikasi JWT, inject req.user
 *   validateRequest(schema)→ Validasi body { oldPassword, newPassword } via Zod
 *   ProfileController      → Proses hash & update password di DB
 */
const router = Router();

// Semua rute profil membutuhkan autentikasi JWT yang valid
router.use(authenticate);

// PATCH /api/v1/profile/avatar
// Gunakan multerUpload.single('file') untuk menghandle upload file tunggal.
// Field name 'file' harus cocok dengan field name di FormData dari frontend.
router.patch(
  '/avatar',
  multerUpload.single('file'),
  ProfileController.updateAvatar
);

// PUT /api/v1/profile/password
// Validasi body dengan updatePasswordSchema sebelum menyentuh database.
router.put(
  '/password',
  validateRequest(updatePasswordSchema),
  ProfileController.updatePassword
);

export default router;
