import { Router } from 'express';
import { PermohonanAnggaranController } from './permohonan-anggaran.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { createPermohonanAnggaranSchema, updatePermohonanAnggaranStatusSchema } from './permohonan-anggaran.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// List budget requests
router.get('/', PermohonanAnggaranController.getPermohonanAnggaran);

// Get single request details
router.get('/:id', PermohonanAnggaranController.getPermohonanAnggaranById);

// Submit a new budget request (Ketua Komisi only)
router.post(
  '/',
  authorize(Role.KETUA_KOMISI, Role.SUPER_ADMIN),
  validateRequest(createPermohonanAnggaranSchema),
  PermohonanAnggaranController.createPermohonanAnggaran
);

// Review or approve budget request status (Bendahara or Pastor)
router.patch(
  '/:id/status',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.SUPER_ADMIN),
  validateRequest(updatePermohonanAnggaranStatusSchema),
  PermohonanAnggaranController.updatePermohonanAnggaranStatus
);

export default router;
