"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExpenseTypeController = void 0;
const expense_type_service_1 = require("./expense-type.service");
class ExpenseTypeController {
    static async getExpenseTypes(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const expenseTypes = await expense_type_service_1.ExpenseTypeService.getExpenseTypes(parokiId);
            res.status(200).json({
                status: 'success',
                data: {
                    expenseTypes,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createExpenseType(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const expenseType = await expense_type_service_1.ExpenseTypeService.createExpenseType(parokiId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Jenis Pengeluaran berhasil disimpan',
                data: {
                    expenseType,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateExpenseType(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const expenseType = await expense_type_service_1.ExpenseTypeService.updateExpenseType(parokiId, id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Jenis Pengeluaran berhasil diperbarui',
                data: {
                    expenseType,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteExpenseType(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            await expense_type_service_1.ExpenseTypeService.deleteExpenseType(parokiId, id);
            res.status(200).json({
                status: 'success',
                message: 'Jenis Pengeluaran berhasil dihapus',
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.ExpenseTypeController = ExpenseTypeController;
