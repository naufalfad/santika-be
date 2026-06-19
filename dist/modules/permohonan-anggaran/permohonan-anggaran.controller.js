"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PermohonanAnggaranController = void 0;
const permohonan_anggaran_service_1 = require("./permohonan-anggaran.service");
class PermohonanAnggaranController {
    static async createPermohonanAnggaran(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const pemohonId = req.user.id;
            const permohonan = await permohonan_anggaran_service_1.PermohonanAnggaranService.createPermohonanAnggaran(parokiId, pemohonId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Permohonan anggaran kegiatan berhasil diajukan',
                data: {
                    permohonan,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getPermohonanAnggaran(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const role = req.user.role;
            const filters = {
                status: req.query.status,
                search: req.query.search,
            };
            const permohonan = await permohonan_anggaran_service_1.PermohonanAnggaranService.getPermohonanAnggaran(parokiId, actorId, role, filters);
            res.status(200).json({
                status: 'success',
                data: {
                    permohonan,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getPermohonanAnggaranById(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const permohonan = await permohonan_anggaran_service_1.PermohonanAnggaranService.getPermohonanAnggaranById(parokiId, id);
            res.status(200).json({
                status: 'success',
                data: {
                    permohonan,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updatePermohonanAnggaranStatus(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const role = req.user.role;
            const id = req.params.id;
            const permohonan = await permohonan_anggaran_service_1.PermohonanAnggaranService.updatePermohonanAnggaranStatus(parokiId, actorId, role, id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Status anggaran berhasil diperbarui',
                data: {
                    permohonan,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.PermohonanAnggaranController = PermohonanAnggaranController;
