"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CashTransactionController = void 0;
const cash_transaction_service_1 = require("./cash-transaction.service");
class CashTransactionController {
    static async getIncomes(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const filters = {
                fund_category_id: req.query.fund_category_id,
                income_type_id: req.query.income_type_id,
                start_date: req.query.start_date ? new Date(req.query.start_date) : undefined,
                end_date: req.query.end_date ? new Date(req.query.end_date) : undefined,
                search: req.query.search,
            };
            const incomes = await cash_transaction_service_1.CashTransactionService.getIncomes(parokiId, filters);
            res.status(200).json({
                status: 'success',
                data: {
                    incomes,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getExpenses(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const filters = {
                fund_category_id: req.query.fund_category_id,
                expense_type_id: req.query.expense_type_id,
                start_date: req.query.start_date ? new Date(req.query.start_date) : undefined,
                end_date: req.query.end_date ? new Date(req.query.end_date) : undefined,
                search: req.query.search,
            };
            const expenses = await cash_transaction_service_1.CashTransactionService.getExpenses(parokiId, filters);
            res.status(200).json({
                status: 'success',
                data: {
                    expenses,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getIncomeById(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const income = await cash_transaction_service_1.CashTransactionService.getTransactionById(parokiId, id, 'INCOME');
            res.status(200).json({
                status: 'success',
                data: {
                    income,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getExpenseById(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const expense = await cash_transaction_service_1.CashTransactionService.getTransactionById(parokiId, id, 'EXPENSE');
            res.status(200).json({
                status: 'success',
                data: {
                    expense,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createIncome(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const userId = req.user.id;
            const newIncome = await cash_transaction_service_1.CashTransactionService.createIncome(parokiId, userId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Kas masuk berhasil dicatat',
                data: {
                    income: newIncome,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createExpense(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const userId = req.user.id;
            const newExpense = await cash_transaction_service_1.CashTransactionService.createExpense(parokiId, userId, req.body, req.file);
            res.status(201).json({
                status: 'success',
                message: 'Kas keluar berhasil dicatat',
                data: {
                    expense: newExpense,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async auditTransaction(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const userId = req.user.id;
            const id = req.params.id;
            const { status, notes } = req.body;
            const updatedTransaction = await cash_transaction_service_1.CashTransactionService.auditTransaction(parokiId, userId, id, status, notes);
            res.status(200).json({
                status: 'success',
                message: 'Hasil verifikasi audit transaksi berhasil disimpan',
                data: {
                    transaction: updatedTransaction,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.CashTransactionController = CashTransactionController;
