"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KasKeluarController = void 0;
const kas_keluar_service_1 = require("./kas-keluar.service");
class KasKeluarController {
    static async getKasKeluar(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const filters = {
                search: req.query.search,
                kategori: req.query.kategori,
                budgetItemId: req.query.budgetItemId,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
            };
            const transactions = await kas_keluar_service_1.KasKeluarService.getKasKeluar(parokiId, filters);
            res.status(200).json({
                status: 'success',
                data: {
                    transactions,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createKasKeluar(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const newTransaction = await kas_keluar_service_1.KasKeluarService.createKasKeluar(parokiId, actorId, req.body, req.file);
            res.status(201).json({
                status: 'success',
                message: 'Transaksi Kas Keluar berhasil dicatat',
                data: {
                    transaction: newTransaction,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateKasKeluar(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const id = req.params.id;
            const updatedTransaction = await kas_keluar_service_1.KasKeluarService.updateKasKeluar(parokiId, actorId, id, req.body, req.file);
            res.status(200).json({
                status: 'success',
                message: 'Transaksi Kas Keluar berhasil diperbarui',
                data: {
                    transaction: updatedTransaction,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteKasKeluar(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const id = req.params.id;
            const deletedTransaction = await kas_keluar_service_1.KasKeluarService.deleteKasKeluar(parokiId, actorId, id);
            res.status(200).json({
                status: 'success',
                message: 'Transaksi Kas Keluar berhasil dihapus',
                data: {
                    transaction: deletedTransaction,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.KasKeluarController = KasKeluarController;
