import { Request, Response, NextFunction } from 'express';
import { SpjService } from './spj.service';
import { ApiError } from '../../common/utils/api-error';

export class SpjController {
  static async getSpjs(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const { search, status } = req.query as any;

      const spjs = await SpjService.getSpjs(parokiId, { search, status });

      res.status(200).json({
        status: 'success',
        data: {
          spjs,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createSpj(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const userId = req.user!.id;
      const userName = req.user!.email;

      const { title, amount, cash_transaction_id, kegiatan_id, permohonan_anggaran_id } = req.body;
      const file = req.file;

      if (!cash_transaction_id) {
        throw ApiError.badRequest('Transaksi kas asal (cash_transaction_id) wajib ditentukan');
      }

      const spj = await SpjService.createSpj(
        parokiId,
        userId,
        userName,
        {
          title,
          amount: Number(amount),
          cash_transaction_id,
          kegiatan_id,
          permohonan_anggaran_id,
        },
        file
      );

      res.status(201).json({
        status: 'success',
        message: 'Pertanggungjawaban SPJ berhasil diunggah',
        data: {
          spj,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async verifySpj(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const userId = req.user!.id;
      const id = req.params.id as string;
      const { status } = req.body;

      const spj = await SpjService.verifySpj(parokiId, userId, id, status);

      res.status(200).json({
        status: 'success',
        message: `Status verifikasi SPJ berhasil diperbarui menjadi ${status}`,
        data: {
          spj,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
