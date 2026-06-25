"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const cash_transaction_controller_1 = require("./cash-transaction.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const upload_middleware_1 = require("../../common/middleware/upload.middleware");
const cash_transaction_schema_1 = require("./cash-transaction.schema");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
// --- INCOMES ---
router.get('/incomes', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.DEWAN_KEUANGAN, client_1.Role.SEKRETARIAT), (0, validation_middleware_1.validateRequest)(cash_transaction_schema_1.getCashTransactionsQuerySchema), cash_transaction_controller_1.CashTransactionController.getIncomes);
router.get('/incomes/:id', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.DEWAN_KEUANGAN, client_1.Role.SEKRETARIAT), cash_transaction_controller_1.CashTransactionController.getIncomeById);
router.post('/incomes', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.SEKRETARIAT), (0, validation_middleware_1.validateRequest)(cash_transaction_schema_1.createIncomeSchema), cash_transaction_controller_1.CashTransactionController.createIncome);
// --- EXPENSES ---
router.get('/expenses', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.DEWAN_KEUANGAN, client_1.Role.KETUA_KOMISI), (0, validation_middleware_1.validateRequest)(cash_transaction_schema_1.getCashTransactionsQuerySchema), cash_transaction_controller_1.CashTransactionController.getExpenses);
router.get('/expenses/:id', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.DEWAN_KEUANGAN, client_1.Role.KETUA_KOMISI), cash_transaction_controller_1.CashTransactionController.getExpenseById);
router.post('/expenses', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.KETUA_KOMISI), upload_middleware_1.multerUpload.single('file'), (0, validation_middleware_1.validateRequest)(cash_transaction_schema_1.createExpenseSchema), cash_transaction_controller_1.CashTransactionController.createExpense);
// --- AUDIT ---
router.put('/transactions/:id/audit', (0, rbac_guard_1.authorize)(client_1.Role.BENDAHARA, client_1.Role.PASTOR, client_1.Role.SUPER_ADMIN), (0, validation_middleware_1.validateRequest)(cash_transaction_schema_1.auditTransactionSchema), cash_transaction_controller_1.CashTransactionController.auditTransaction);
exports.default = router;
