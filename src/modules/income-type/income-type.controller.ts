import { Request, Response, NextFunction } from 'express';
import { IncomeTypeService } from './income-type.service';

export class IncomeTypeController {
  static async getIncomeTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const incomeTypes = await IncomeTypeService.getIncomeTypes(parokiId);

      res.status(200).json({
        status: 'success',
        data: {
          incomeTypes,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createIncomeType(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const incomeType = await IncomeTypeService.createIncomeType(parokiId, req.body);

      res.status(201).json({
        status: 'success',
        message: 'Jenis Penerimaan berhasil disimpan',
        data: {
          incomeType,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateIncomeType(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const incomeType = await IncomeTypeService.updateIncomeType(parokiId, id, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Jenis Penerimaan berhasil diperbarui',
        data: {
          incomeType,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteIncomeType(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      await IncomeTypeService.deleteIncomeType(parokiId, id);

      res.status(200).json({
        status: 'success',
        message: 'Jenis Penerimaan berhasil dihapus',
      });
    } catch (error) {
      next(error);
    }
  }
}
