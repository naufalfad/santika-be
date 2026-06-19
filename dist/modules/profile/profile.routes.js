"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const profile_controller_1 = require("./profile.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const upload_middleware_1 = require("../../common/middleware/upload.middleware");
const profile_schema_1 = require("./profile.schema");
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
const router = (0, express_1.Router)();
// Semua rute profil membutuhkan autentikasi JWT yang valid
router.use(auth_middleware_1.authenticate);
// PATCH /api/v1/profile/avatar
// Gunakan multerUpload.single('file') untuk menghandle upload file tunggal.
// Field name 'file' harus cocok dengan field name di FormData dari frontend.
router.patch('/avatar', upload_middleware_1.multerUpload.single('file'), profile_controller_1.ProfileController.updateAvatar);
// PUT /api/v1/profile/password
// Validasi body dengan updatePasswordSchema sebelum menyentuh database.
router.put('/password', (0, validation_middleware_1.validateRequest)(profile_schema_1.updatePasswordSchema), profile_controller_1.ProfileController.updatePassword);
exports.default = router;
