"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KasMasukController = void 0;
const kas_masuk_service_1 = require("./kas-masuk.service");
class KasMasukController {
    static async getKasMasuk(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const filters = {
                search: req.query.search,
                kategori: req.query.kategori,
                startDate: req.query.startDate,
                endDate: req.query.endDate,
            };
            const transactions = await kas_masuk_service_1.KasMasukService.getKasMasuk(parokiId, filters);
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
    static async createKasMasuk(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const newTransaction = await kas_masuk_service_1.KasMasukService.createKasMasuk(parokiId, actorId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'Transaksi Kas Masuk berhasil dicatat',
                data: {
                    transaction: newTransaction,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateKasMasuk(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const id = req.params.id;
            const updatedTransaction = await kas_masuk_service_1.KasMasukService.updateKasMasuk(parokiId, actorId, id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Transaksi Kas Masuk berhasil diperbarui',
                data: {
                    transaction: updatedTransaction,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async deleteKasMasuk(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const id = req.params.id;
            const deletedTransaction = await kas_masuk_service_1.KasMasukService.deleteKasMasuk(parokiId, actorId, id);
            res.status(200).json({
                status: 'success',
                message: 'Transaksi Kas Masuk berhasil dihapus',
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
exports.KasMasukController = KasMasukController;
