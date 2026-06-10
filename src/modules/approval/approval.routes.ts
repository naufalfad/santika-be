import { Router } from 'express';
import { ApprovalController } from './approval.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import {
  createPengajuanSchema,
  updateApprovalStatusSchema,
  getApprovalsQuerySchema,
} from './approval.schema';
import { Role } from '@prisma/client';

const router = Router();

// Apply auth middleware globally
router.use(authenticate);

// Get approval list (scoped by Role & Paroki inside service)
router.get(
  '/',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.KETUA_KOMISI),
  validateRequest(getApprovalsQuerySchema),
  ApprovalController.getApprovals
);

// Submit a new proposal (Ketua Komisi only)
router.post(
  '/',
  authorize(Role.KETUA_KOMISI),
  validateRequest(createPengajuanSchema),
  ApprovalController.createPengajuan
);

// Process state machine transitions
router.patch(
  '/:id/status',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.KETUA_KOMISI),
  validateRequest(updateApprovalStatusSchema),
  ApprovalController.updateApprovalStatus
);

export default router;
