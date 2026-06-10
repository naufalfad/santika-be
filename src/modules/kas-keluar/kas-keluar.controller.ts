import { Request, Response, NextFunction } from 'express';
import { KasKeluarService } from './kas-keluar.service';

export class KasKeluarController {
  static async getKasKeluar(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const filters = {
        search: req.query.search as string | undefined,
        kategori: req.query.kategori as string | undefined,
        anggaranId: req.query.anggaranId as string | undefined,
        startDate: req.query.startDate as Date | undefined,
        endDate: req.query.endDate as Date | undefined,
      };

      const transactions = await KasKeluarService.getKasKeluar(parokiId, filters);

      res.status(200).json({
        status: 'success',
        data: {
          transactions,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createKasKeluar(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;

      const newTransaction = await KasKeluarService.createKasKeluar(
        parokiId,
        actorId,
        req.body,
        req.file
      );

      res.status(201).json({
        status: 'success',
        message: 'Transaksi Kas Keluar berhasil dicatat',
        data: {
          transaction: newTransaction,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateKasKeluar(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const id = req.params.id as string;

      const updatedTransaction = await KasKeluarService.updateKasKeluar(
        parokiId,
        actorId,
        id,
        req.body,
        req.file
      );

      res.status(200).json({
        status: 'success',
        message: 'Transaksi Kas Keluar berhasil diperbarui',
        data: {
          transaction: updatedTransaction,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteKasKeluar(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const id = req.params.id as string;

      const deletedTransaction = await KasKeluarService.deleteKasKeluar(
        parokiId,
        actorId,
        id
      );

      res.status(200).json({
        status: 'success',
        message: 'Transaksi Kas Keluar berhasil dihapus',
        data: {
          transaction: deletedTransaction,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
