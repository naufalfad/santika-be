"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const audit_log_controller_1 = require("./audit-log.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Secure route: only logged in SUPER_ADMIN, PASTOR, and BENDAHARA can view audit logs
router.use(auth_middleware_1.authenticate);
router.use((0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.PASTOR, client_1.Role.BENDAHARA));
router.get('/', audit_log_controller_1.AuditLogController.getLogs);
exports.default = router;
