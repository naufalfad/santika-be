"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const approval_controller_1 = require("./approval.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const approval_schema_1 = require("./approval.schema");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply auth middleware globally
router.use(auth_middleware_1.authenticate);
// Get approval list (scoped by Role & Paroki inside service)
router.get('/', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.KETUA_KOMISI), (0, validation_middleware_1.validateRequest)(approval_schema_1.getApprovalsQuerySchema), approval_controller_1.ApprovalController.getApprovals);
// Submit a new proposal (Ketua Komisi only)
router.post('/', (0, rbac_guard_1.authorize)(client_1.Role.KETUA_KOMISI), (0, validation_middleware_1.validateRequest)(approval_schema_1.createPengajuanSchema), approval_controller_1.ApprovalController.createPengajuan);
// Process state machine transitions
router.patch('/:id/status', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.KETUA_KOMISI), (0, validation_middleware_1.validateRequest)(approval_schema_1.updateApprovalStatusSchema), approval_controller_1.ApprovalController.updateApprovalStatus);
exports.default = router;
