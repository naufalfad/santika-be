import { Request, Response, NextFunction } from 'express';
import { AnggaranService } from './anggaran.service';

export class AnggaranController {
  static async getAnggaran(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const filters = {
        tahun: req.query.tahun ? Number(req.query.tahun) : undefined,
        komisiId: req.query.komisiId as string | undefined,
      };

      const budgets = await AnggaranService.getAnggaran(parokiId, filters);

      res.status(200).json({
        status: 'success',
        data: {
          budgets,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createAnggaran(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;

      const newBudget = await AnggaranService.createAnggaran(
        parokiId,
        actorId,
        req.body
      );

      res.status(201).json({
        status: 'success',
        message: 'Alokasi anggaran berhasil disimpan',
        data: {
          budget: newBudget,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateAnggaran(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const id = req.params.id as string;

      const updatedBudget = await AnggaranService.updateAnggaran(
        parokiId,
        actorId,
        id,
        req.body
      );

      res.status(200).json({
        status: 'success',
        message: 'Alokasi anggaran berhasil diperbarui',
        data: {
          budget: updatedBudget,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
