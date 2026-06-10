import { Request, Response, NextFunction } from 'express';
import { ApprovalService } from './approval.service';
import { ApprovalStatus, Role } from '@prisma/client';

export class ApprovalController {
  static async getApprovals(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const role = req.user!.role as Role;

      const filters = {
        status: req.query.status as ApprovalStatus | undefined,
        search: req.query.search as string | undefined,
      };

      const approvals = await ApprovalService.getApprovals(
        parokiId,
        actorId,
        role,
        filters
      );

      res.status(200).json({
        status: 'success',
        data: {
          approvals,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createPengajuan(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;

      const newPengajuan = await ApprovalService.createPengajuan(
        parokiId,
        actorId,
        req.body
      );

      res.status(201).json({
        status: 'success',
        message: 'Pengajuan proposal berhasil disimpan',
        data: {
          approval: newPengajuan,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateApprovalStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const role = req.user!.role as Role;
      const id = req.params.id as string;

      const updated = await ApprovalService.updateApprovalStatus(
        parokiId,
        actorId,
        role,
        id,
        req.body
      );

      res.status(200).json({
        status: 'success',
        message: 'Status pengajuan berhasil diperbarui',
        data: {
          approval: updated,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
