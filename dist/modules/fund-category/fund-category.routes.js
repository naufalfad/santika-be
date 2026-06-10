"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const fund_category_controller_1 = require("./fund-category.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const fund_category_schema_1 = require("./fund-category.schema");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// Balances endpoint must be registered before /:id parameter match
router.get('/balances', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.DEWAN_KEUANGAN), fund_category_controller_1.FundCategoryController.getFundBalances);
router.get('/', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.DEWAN_KEUANGAN), fund_category_controller_1.FundCategoryController.getFundCategories);
router.post('/', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA), (0, validation_middleware_1.validateRequest)(fund_category_schema_1.createFundCategorySchema), fund_category_controller_1.FundCategoryController.createFundCategory);
router.put('/:id', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA), (0, validation_middleware_1.validateRequest)(fund_category_schema_1.updateFundCategorySchema), fund_category_controller_1.FundCategoryController.updateFundCategory);
router.delete('/:id', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA), fund_category_controller_1.FundCategoryController.deleteFundCategory);
exports.default = router;
