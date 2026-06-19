"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SpjController = void 0;
const spj_service_1 = require("./spj.service");
const api_error_1 = require("../../common/utils/api-error");
class SpjController {
    static async getSpjs(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const { search, status } = req.query;
            const spjs = await spj_service_1.SpjService.getSpjs(parokiId, { search, status });
            res.status(200).json({
                status: 'success',
                data: {
                    spjs,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createSpj(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const userId = req.user.id;
            const userName = req.user.email;
            const { title, amount, cash_transaction_id, kegiatan_id, permohonan_anggaran_id } = req.body;
            const file = req.file;
            if (!cash_transaction_id) {
                throw api_error_1.ApiError.badRequest('Transaksi kas asal (cash_transaction_id) wajib ditentukan');
            }
            const spj = await spj_service_1.SpjService.createSpj(parokiId, userId, userName, {
                title,
                amount: Number(amount),
                cash_transaction_id,
                kegiatan_id,
                permohonan_anggaran_id,
            }, file);
            res.status(201).json({
                status: 'success',
                message: 'Pertanggungjawaban SPJ berhasil diunggah',
                data: {
                    spj,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async verifySpj(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const userId = req.user.id;
            const id = req.params.id;
            const { status } = req.body;
            const spj = await spj_service_1.SpjService.verifySpj(parokiId, userId, id, status);
            res.status(200).json({
                status: 'success',
                message: `Status verifikasi SPJ berhasil diperbarui menjadi ${status}`,
                data: {
                    spj,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.SpjController = SpjController;
