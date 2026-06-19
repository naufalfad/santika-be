"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KegiatanController = void 0;
const kegiatan_service_1 = require("./kegiatan.service");
class KegiatanController {
    static async createKegiatan(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const pemohonId = req.user.id;
            const files = req.files;
            const bodyParsed = {
                namaKegiatan: req.body.namaKegiatan,
                deskripsiKegiatan: req.body.deskripsiKegiatan,
                tujuanKegiatan: req.body.tujuanKegiatan,
                kategoriKegiatan: req.body.kategoriKegiatan,
                komisiId: req.body.komisiId,
                lokasi: req.body.lokasi,
                tanggalMulai: new Date(req.body.tanggalMulai),
                tanggalSelesai: new Date(req.body.tanggalSelesai),
                jumlahPeserta: Number(req.body.jumlahPeserta || 0),
                prioritas: req.body.prioritas,
                status: req.body.status,
                totalAnggaran: req.body.totalAnggaran !== undefined && req.body.totalAnggaran !== null ? Number(req.body.totalAnggaran) : undefined,
                posDanaId: req.body.posDanaId || undefined,
            };
            const kegiatan = await kegiatan_service_1.KegiatanService.createKegiatan(parokiId, pemohonId, bodyParsed, files);
            res.status(201).json({
                status: 'success',
                message: 'Pengajuan kegiatan berhasil disimpan',
                data: {
                    kegiatan,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getKegiatan(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const role = req.user.role;
            const filters = {
                status: req.query.status,
                search: req.query.search,
            };
            const kegiatan = await kegiatan_service_1.KegiatanService.getKegiatan(parokiId, actorId, role, filters);
            res.status(200).json({
                status: 'success',
                data: {
                    kegiatan,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async getKegiatanById(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const id = req.params.id;
            const kegiatan = await kegiatan_service_1.KegiatanService.getKegiatanById(parokiId, id);
            res.status(200).json({
                status: 'success',
                data: {
                    kegiatan,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateKegiatanStatus(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const role = req.user.role;
            const id = req.params.id;
            const kegiatan = await kegiatan_service_1.KegiatanService.updateKegiatanStatus(parokiId, actorId, role, id, req.body);
            res.status(200).json({
                status: 'success',
                message: 'Status kegiatan berhasil diperbarui',
                data: {
                    kegiatan,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.KegiatanController = KegiatanController;
