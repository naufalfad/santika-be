"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const anggaran_controller_1 = require("./anggaran.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const anggaran_schema_1 = require("./anggaran.schema");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply auth middleware globally to all Anggaran routes
router.use(auth_middleware_1.authenticate);
// Routes with specific RBAC guards and validators
router.get('/', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.DEWAN_KEUANGAN), (0, validation_middleware_1.validateRequest)(anggaran_schema_1.getAnggaranQuerySchema), anggaran_controller_1.AnggaranController.getAnggaran);
router.post('/', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA), (0, validation_middleware_1.validateRequest)(anggaran_schema_1.createAnggaranSchema), anggaran_controller_1.AnggaranController.createAnggaran);
router.put('/:id', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA), (0, validation_middleware_1.validateRequest)(anggaran_schema_1.updateAnggaranSchema), anggaran_controller_1.AnggaranController.updateAnggaran);
exports.default = router;
