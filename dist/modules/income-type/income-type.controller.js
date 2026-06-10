"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IncomeTypeController = void 0;
const income_type_service_1 = require("./income-type.service");
class IncomeTypeController {
    static async getIncomeTypes(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const incomeTypes = await income_type_service_1.IncomeTypeService.getIncomeTypes(parokiId);
            res.status(200).json({
                status: 'success',
                data: {
                    incomeTypes,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createIncomeType(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const incomeType = await income_type_service_1.IncomeTypeService.createIncomeType(parokiId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Jenis Penerimaan berhasil disimpan',
                data: {
                    incomeType,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateIncomeType(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const incomeType = await income_type_service_1.IncomeTypeService.updateIncomeType(parokiId, id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Jenis Penerimaan berhasil diperbarui',
                data: {
                    incomeType,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteIncomeType(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            await income_type_service_1.IncomeTypeService.deleteIncomeType(parokiId, id);
            res.status(200).json({
                status: 'success',
                message: 'Jenis Penerimaan berhasil dihapus',
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.IncomeTypeController = IncomeTypeController;
