import { Request, Response, NextFunction } from 'express';
import { AuditLogService } from './audit-log.service';

export class AuditLogController {
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const filters = {
        search: req.query.search as string | undefined,
        type: req.query.type as string | undefined,
        page: req.query.page ? parseInt(req.query.page as string, 10) : undefined,
        limit: req.query.limit ? parseInt(req.query.limit as string, 10) : undefined,
      };

      const result = await AuditLogService.getLogs(parokiId, filters);

      res.status(200).json({
        status: 'success',
        data: result,
      });
    } catch (error) {
      next(error);
    }
  }
}
