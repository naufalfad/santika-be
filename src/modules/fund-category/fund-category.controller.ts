import { Request, Response, NextFunction } from 'express';
import { FundCategoryService } from './fund-category.service';

export class FundCategoryController {
  static async getFundCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const categories = await FundCategoryService.getFundCategories(parokiId);

      res.status(200).json({
        status: 'success',
        data: {
          categories,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createFundCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const category = await FundCategoryService.createFundCategory(parokiId, req.body);

      res.status(201).json({
        status: 'success',
        message: 'Pos Dana berhasil disimpan',
        data: {
          category,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateFundCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const category = await FundCategoryService.updateFundCategory(parokiId, id, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Pos Dana berhasil diperbarui',
        data: {
          category,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteFundCategory(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      await FundCategoryService.deleteFundCategory(parokiId, id);

      res.status(200).json({
        status: 'success',
        message: 'Pos Dana berhasil dihapus',
      });
    } catch (error) {
      next(error);
    }
  }

  static async getFundBalances(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const balances = await FundCategoryService.getFundBalances(parokiId);

      res.status(200).json(balances);
    } catch (error) {
      next(error);
    }
  }
}
