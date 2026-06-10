"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const kas_keluar_controller_1 = require("./kas-keluar.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const upload_middleware_1 = require("../../common/middleware/upload.middleware");
const kas_keluar_schema_1 = require("./kas-keluar.schema");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply auth middleware globally to all Kas Keluar routes
router.use(auth_middleware_1.authenticate);
// Routes with specific RBAC guards and middlewares
router.get('/', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.KETUA_KOMISI), (0, validation_middleware_1.validateRequest)(kas_keluar_schema_1.getKasKeluarQuerySchema), kas_keluar_controller_1.KasKeluarController.getKasKeluar);
router.post('/', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.KETUA_KOMISI), upload_middleware_1.multerUpload.single('file'), (0, validation_middleware_1.validateRequest)(kas_keluar_schema_1.createKasKeluarSchema), kas_keluar_controller_1.KasKeluarController.createKasKeluar);
router.put('/:id', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA), upload_middleware_1.multerUpload.single('file'), (0, validation_middleware_1.validateRequest)(kas_keluar_schema_1.updateKasKeluarSchema), kas_keluar_controller_1.KasKeluarController.updateKasKeluar);
router.delete('/:id', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA), kas_keluar_controller_1.KasKeluarController.deleteKasKeluar);
exports.default = router;
