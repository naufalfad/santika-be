import { Request, Response, NextFunction } from 'express';
import { KasMasukService } from './kas-masuk.service';

export class KasMasukController {
  static async getKasMasuk(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const filters = {
        search: req.query.search as string | undefined,
        kategori: req.query.kategori as string | undefined,
        startDate: req.query.startDate as Date | undefined,
        endDate: req.query.endDate as Date | undefined,
      };

      const transactions = await KasMasukService.getKasMasuk(parokiId, filters);

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

  static async createKasMasuk(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;

      const newTransaction = await KasMasukService.createKasMasuk(
        parokiId,
        actorId,
        req.body
      );

      res.status(201).json({
        status: 'success',
        message: 'Transaksi Kas Masuk berhasil dicatat',
        data: {
          transaction: newTransaction,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateKasMasuk(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const id = req.params.id as string;

      const updatedTransaction = await KasMasukService.updateKasMasuk(
        parokiId,
        actorId,
        id,
        req.body
      );

      res.status(200).json({
        status: 'success',
        message: 'Transaksi Kas Masuk berhasil diperbarui',
        data: {
          transaction: updatedTransaction,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteKasMasuk(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const id = req.params.id as string;

      const deletedTransaction = await KasMasukService.deleteKasMasuk(
        parokiId,
        actorId,
        id
      );

      res.status(200).json({
        status: 'success',
        message: 'Transaksi Kas Masuk berhasil dihapus',
        data: {
          transaction: deletedTransaction,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
