"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const special_fund_controller_1 = require("./special-fund.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const special_fund_schema_1 = require("./special-fund.schema");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Allow SUPER_ADMIN, PASTOR, BENDAHARA, DEWAN_KEUANGAN to view list and details
router.get('/', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.PASTOR, client_1.Role.BENDAHARA, client_1.Role.DEWAN_KEUANGAN), special_fund_controller_1.SpecialFundController.getSpecialFunds);
router.get('/:id', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.PASTOR, client_1.Role.BENDAHARA, client_1.Role.DEWAN_KEUANGAN), special_fund_controller_1.SpecialFundController.getSpecialFundById);
router.get('/:id/transactions', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.PASTOR, client_1.Role.BENDAHARA, client_1.Role.DEWAN_KEUANGAN), special_fund_controller_1.SpecialFundController.getSpecialFundTransactions);
router.get('/:id/report', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.PASTOR, client_1.Role.BENDAHARA, client_1.Role.DEWAN_KEUANGAN), special_fund_controller_1.SpecialFundController.getSpecialFundReport);
// Creation, update, deletion, activation, close, allocation are restricted to BENDAHARA and SUPER_ADMIN
router.post('/', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.BENDAHARA), (0, validation_middleware_1.validateRequest)(special_fund_schema_1.createSpecialFundSchema), special_fund_controller_1.SpecialFundController.createSpecialFund);
router.put('/:id', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.BENDAHARA), (0, validation_middleware_1.validateRequest)(special_fund_schema_1.updateSpecialFundSchema), special_fund_controller_1.SpecialFundController.updateSpecialFund);
router.delete('/:id', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.BENDAHARA), special_fund_controller_1.SpecialFundController.deleteSpecialFund);
router.post('/:id/activate', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.BENDAHARA), special_fund_controller_1.SpecialFundController.activateSpecialFund);
router.post('/:id/close', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.BENDAHARA), special_fund_controller_1.SpecialFundController.closeSpecialFund);
router.post('/:id/allocate', (0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN, client_1.Role.BENDAHARA), (0, validation_middleware_1.validateRequest)(special_fund_schema_1.allocateSpecialFundSchema), special_fund_controller_1.SpecialFundController.allocateRemainingBalance);
exports.default = router;
