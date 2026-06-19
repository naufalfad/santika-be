"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const permohonan_anggaran_controller_1 = require("./permohonan-anggaran.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const permohonan_anggaran_schema_1 = require("./permohonan-anggaran.schema");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// List budget requests
router.get('/', permohonan_anggaran_controller_1.PermohonanAnggaranController.getPermohonanAnggaran);
// Get single request details
router.get('/:id', permohonan_anggaran_controller_1.PermohonanAnggaranController.getPermohonanAnggaranById);
// Submit a new budget request (Ketua Komisi only)
router.post('/', (0, rbac_guard_1.authorize)(client_1.Role.KETUA_KOMISI, client_1.Role.SUPER_ADMIN), (0, validation_middleware_1.validateRequest)(permohonan_anggaran_schema_1.createPermohonanAnggaranSchema), permohonan_anggaran_controller_1.PermohonanAnggaranController.createPermohonanAnggaran);
// Review or approve budget request status (Bendahara or Pastor)
router.patch('/:id/status', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.SUPER_ADMIN), (0, validation_middleware_1.validateRequest)(permohonan_anggaran_schema_1.updatePermohonanAnggaranStatusSchema), permohonan_anggaran_controller_1.PermohonanAnggaranController.updatePermohonanAnggaranStatus);
exports.default = router;
