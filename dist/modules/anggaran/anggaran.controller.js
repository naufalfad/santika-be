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
                fund_category_id: req.query.fund_category_id,
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
    static async getKomisi(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const komisi = await anggaran_service_1.AnggaranService.getKomisi(parokiId);
            res.status(200).json({
                status: 'success',
                data: {
                    komisi,
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
    static async getAnggaranDashboard(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const tahun = req.query.tahun ? Number(req.query.tahun) : new Date().getFullYear();
            const fund_category_id = req.query.fund_category_id;
            const dashboard = await anggaran_service_1.AnggaranService.getAnggaranDashboard(parokiId, {
                tahun,
                fund_category_id,
            });
            res.status(200).json({
                status: 'success',
                data: dashboard,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AnggaranController = AnggaranController;
