"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kegiatan_controller_1 = require("./kegiatan.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const upload_middleware_1 = require("../../common/middleware/upload.middleware");
const kegiatan_schema_1 = require("./kegiatan.schema");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// List activities
router.get('/', kegiatan_controller_1.KegiatanController.getKegiatan);
// Get single activity detail
router.get('/:id', kegiatan_controller_1.KegiatanController.getKegiatanById);
// Submit or create a new activity proposal (Ketua Komisi only, support files)
router.post('/', (0, rbac_guard_1.authorize)(client_1.Role.KETUA_KOMISI, client_1.Role.SUPER_ADMIN), upload_middleware_1.multerUpload.array('files', 10), (0, validation_middleware_1.validateRequest)(kegiatan_schema_1.createKegiatanSchema), kegiatan_controller_1.KegiatanController.createKegiatan);
// Review activity status (Bendahara or Pastor)
router.patch('/:id/status', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.SUPER_ADMIN), (0, validation_middleware_1.validateRequest)(kegiatan_schema_1.updateKegiatanStatusSchema), kegiatan_controller_1.KegiatanController.updateKegiatanStatus);
exports.default = router;
