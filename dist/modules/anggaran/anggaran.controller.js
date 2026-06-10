"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnggaranController = void 0;
const anggaran_service_1 = require("./anggaran.service");
class AnggaranController {
    static async getAnggaran(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const filters = {
                tahun: req.query.tahun ? Number(req.query.tahun) : undefined,
                komisiId: req.query.komisiId,
            };
            const budgets = await anggaran_service_1.AnggaranService.getAnggaran(parokiId, filters);
            res.status(200).json({
                status: 'success',
                data: {
                    budgets,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createAnggaran(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const newBudget = await anggaran_service_1.AnggaranService.createAnggaran(parokiId, actorId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Alokasi anggaran berhasil disimpan',
                data: {
                    budget: newBudget,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateAnggaran(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const id = req.params.id;
            const updatedBudget = await anggaran_service_1.AnggaranService.updateAnggaran(parokiId, actorId, id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Alokasi anggaran berhasil diperbarui',
                data: {
                    budget: updatedBudget,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AnggaranController = AnggaranController;
