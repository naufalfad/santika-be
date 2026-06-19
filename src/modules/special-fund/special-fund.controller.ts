import { Request, Response, NextFunction } from 'express';
import { SpecialFundService } from './special-fund.service';

export class SpecialFundController {
  static async createSpecialFund(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const userId = req.user!.id;
      const result = await SpecialFundService.createSpecialFund(parokiId, userId, req.body);

      res.status(201).json({
        status: 'success',
        message: 'Dana Khusus berhasil dibuat',
        data: { specialFund: result },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSpecialFunds(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const { status } = req.query;
      const result = await SpecialFundService.getSpecialFunds(parokiId, status as string);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getSpecialFundById(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const result = await SpecialFundService.getSpecialFundById(parokiId, id);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async updateSpecialFund(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const userId = req.user!.id;
      const result = await SpecialFundService.updateSpecialFund(parokiId, id, userId, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Dana Khusus berhasil diperbarui',
        data: { specialFund: result },
      });
    } catch (error) {
      next(error);
    }
  }

  static async deleteSpecialFund(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const userId = req.user!.id;
      await SpecialFundService.deleteSpecialFund(parokiId, id, userId);

      res.status(200).json({
        status: 'success',
        message: 'Dana Khusus berhasil dihapus',
      });
    } catch (error) {
      next(error);
    }
  }

  static async activateSpecialFund(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const userId = req.user!.id;
      const result = await SpecialFundService.activateSpecialFund(parokiId, id, userId);

      res.status(200).json({
        status: 'success',
        message: 'Dana Khusus berhasil diaktifkan',
        data: { specialFund: result },
      });
    } catch (error) {
      next(error);
    }
  }

  static async closeSpecialFund(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const userId = req.user!.id;
      const result = await SpecialFundService.closeSpecialFund(parokiId, id, userId);

      res.status(200).json({
        status: 'success',
        message: 'Dana Khusus berhasil ditutup',
        data: { specialFund: result },
      });
    } catch (error) {
      next(error);
    }
  }

  static async allocateRemainingBalance(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const userId = req.user!.id;
      const result = await SpecialFundService.allocateRemainingBalance(parokiId, id, userId, req.body);

      res.status(200).json({
        status: 'success',
        message: 'Sisa saldo Dana Khusus berhasil dialokasikan',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSpecialFundTransactions(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const result = await SpecialFundService.getSpecialFundTransactions(parokiId, id);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }

  static async getSpecialFundReport(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const id = req.params.id as string;
      const result = await SpecialFundService.getSpecialFundReport(parokiId, id);

      res.status(200).json(result);
    } catch (error) {
      next(error);
    }
  }
}
