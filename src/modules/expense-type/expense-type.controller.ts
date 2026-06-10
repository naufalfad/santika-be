import { Request, Response, NextFunction } from 'express';
import { ExpenseTypeService } from './expense-type.service';

export class ExpenseTypeController {
  static async getExpenseTypes(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const expenseTypes = await ExpenseTypeService.getExpenseTypes(parokiId);

      res.status(200).json({
        status: 'success',
        data: {
          expenseTypes,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createExpenseType(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const expenseType = await ExpenseTypeService.createExpenseType(parokiId, req.body);

      res.status(201).json({
        status: 'success',
        message: 'Jenis Pengeluaran berhasil disimpan',
        data: {
          expenseType,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateExpenseType(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const expenseType = await ExpenseTypeService.updateExpenseType(parokiId, id, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Jenis Pengeluaran berhasil diperbarui',
        data: {
          expenseType,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteExpenseType(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      await ExpenseTypeService.deleteExpenseType(parokiId, id);

      res.status(200).json({
        status: 'success',
        message: 'Jenis Pengeluaran berhasil dihapus',
      });
    } catch (error) {
      next(error);
    }
  }
}
