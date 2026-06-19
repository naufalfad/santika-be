import { Request, Response, NextFunction } from 'express';
import { KegiatanService } from './kegiatan.service';
import { StatusKegiatan, Role } from '@prisma/client';

export class KegiatanController {
  static async createKegiatan(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const pemohonId = req.user!.id;
      const files = req.files as Express.Multer.File[] | undefined;

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
        status: req.body.status as StatusKegiatan | undefined,
        totalAnggaran: req.body.totalAnggaran !== undefined && req.body.totalAnggaran !== null ? Number(req.body.totalAnggaran) : undefined,
        posDanaId: req.body.posDanaId || undefined,
      };

      const kegiatan = await KegiatanService.createKegiatan(
        parokiId,
        pemohonId,
        bodyParsed,
        files
      );

      res.status(201).json({
        status: 'success',
        message: 'Pengajuan kegiatan berhasil disimpan',
        data: {
          kegiatan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getKegiatan(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const role = req.user!.role as Role;

      const filters = {
        status: req.query.status as StatusKegiatan | undefined,
        search: req.query.search as string | undefined,
      };

      const kegiatan = await KegiatanService.getKegiatan(
        parokiId,
        actorId,
        role,
        filters
      );

      res.status(200).json({
        status: 'success',
        data: {
          kegiatan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getKegiatanById(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;

      const kegiatan = await KegiatanService.getKegiatanById(parokiId, id);

      res.status(200).json({
        status: 'success',
        data: {
          kegiatan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateKegiatanStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const role = req.user!.role as Role;
      const id = req.params.id as string;

      const kegiatan = await KegiatanService.updateKegiatanStatus(
        parokiId,
        actorId,
        role,
        id,
        req.body
      );

      res.status(200).json({
        status: 'success',
        message: 'Status kegiatan berhasil diperbarui',
        data: {
          kegiatan,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
