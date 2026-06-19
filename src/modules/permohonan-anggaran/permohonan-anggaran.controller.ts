import { Request, Response, NextFunction } from 'express';
import { PermohonanAnggaranService } from './permohonan-anggaran.service';
import { StatusPermohonanAnggaran, Role } from '@prisma/client';

export class PermohonanAnggaranController {
  static async createPermohonanAnggaran(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const pemohonId = req.user!.id;

      const permohonan = await PermohonanAnggaranService.createPermohonanAnggaran(
        parokiId,
        pemohonId,
        req.body
      );

      res.status(201).json({
        status: 'success',
        message: 'Permohonan anggaran kegiatan berhasil diajukan',
        data: {
          permohonan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPermohonanAnggaran(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const role = req.user!.role as Role;

      const filters = {
        status: req.query.status as StatusPermohonanAnggaran | undefined,
        search: req.query.search as string | undefined,
      };

      const permohonan = await PermohonanAnggaranService.getPermohonanAnggaran(
        parokiId,
        actorId,
        role,
        filters
      );

      res.status(200).json({
        status: 'success',
        data: {
          permohonan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPermohonanAnggaranById(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;

      const permohonan = await PermohonanAnggaranService.getPermohonanAnggaranById(parokiId, id);

      res.status(200).json({
        status: 'success',
        data: {
          permohonan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updatePermohonanAnggaranStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const role = req.user!.role as Role;
      const id = req.params.id as string;

      const permohonan = await PermohonanAnggaranService.updatePermohonanAnggaranStatus(
        parokiId,
        actorId,
        role,
        id,
        req.body
      );

      res.status(200).json({
        status: 'success',
        message: 'Status anggaran berhasil diperbarui',
        data: {
          permohonan,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
