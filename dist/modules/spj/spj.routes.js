"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const spj_controller_1 = require("./spj.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const upload_middleware_1 = require("../../common/middleware/upload.middleware");
const client_1 = require("@prisma/client");
const spj_schema_1 = require("./spj.schema");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// List all SPJs (all paroki users can view)
router.get('/', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.PASTOR, client_1.Role.BENDAHARA, client_1.Role.DEWAN_KEUANGAN, client_1.Role.KETUA_KOMISI, client_1.Role.TIM_PEMBANGUNAN, client_1.Role.SEKRETARIAT), (0, validation_middleware_1.validateRequest)(spj_schema_1.getSpjsQuerySchema), spj_controller_1.SpjController.getSpjs);
// Upload a new SPJ (execution/proposal roles can upload)
router.post('/', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.KETUA_KOMISI, client_1.Role.TIM_PEMBANGUNAN, client_1.Role.SEKRETARIAT), upload_middleware_1.multerUpload.single('file'), (0, validation_middleware_1.validateRequest)(spj_schema_1.createSpjSchema), spj_controller_1.SpjController.createSpj);
// Verify SPJ status (only Bendahara can verify/approve)
router.patch('/:id/status', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA), (0, validation_middleware_1.validateRequest)(spj_schema_1.updateSpjStatusSchema), spj_controller_1.SpjController.verifySpj);
exports.default = router;
