import { Request, Response, NextFunction } from 'express';
import { ReportService } from './report.service';

export class ReportController {
  static async getBkuReport(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const period = req.query.period as string | undefined;
      const search = req.query.search as string | undefined;

      const reportData = await ReportService.getBkuReport(parokiId, period, search);

      res.status(200).json({
        status: 'success',
        data: reportData,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getCashFlowReport(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const period = req.query.period as string | undefined;

      const reportData = await ReportService.getCashFlowReport(parokiId, period);

      res.status(200).json({
        status: 'success',
        data: reportData,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getBudgetRealisationReport(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const year = req.query.year ? parseInt(req.query.year as string, 10) : undefined;

      const reportData = await ReportService.getBudgetRealisationReport(parokiId, year);

      res.status(200).json({
        status: 'success',
        data: {
          realisations: reportData,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async getSignatories(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const data = await ReportService.getSignatories(parokiId);
      res.status(200).json({
        status: 'success',
        data,
      });
    } catch (error) {
      next(error);
    }
  }
}

