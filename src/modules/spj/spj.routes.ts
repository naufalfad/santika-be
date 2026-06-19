import { Router } from 'express';
import { SpjController } from './spj.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { multerUpload } from '../../common/middleware/upload.middleware';
import { Role } from '@prisma/client';
import {
  createSpjSchema,
  updateSpjStatusSchema,
  getSpjsQuerySchema,
} from './spj.schema';

const router = Router();

router.use(authenticate);

// List all SPJs (all paroki users can view)
router.get(
  '/',
  authorize(
    Role.SUPER_ADMIN,
    Role.PASTOR,
    Role.BENDAHARA,
    Role.DEWAN_KEUANGAN,
    Role.KETUA_KOMISI,
    Role.TIM_PEMBANGUNAN,
    Role.SEKRETARIAT
  ),
  validateRequest(getSpjsQuerySchema),
  SpjController.getSpjs
);

// Upload a new SPJ (execution/proposal roles can upload)
router.post(
  '/',
  authorize(Role.BENDAHARA, Role.KETUA_KOMISI, Role.TIM_PEMBANGUNAN, Role.SEKRETARIAT),
  multerUpload.single('file'),
  validateRequest(createSpjSchema),
  SpjController.createSpj
);

// Verify SPJ status (only Bendahara can verify/approve)
router.patch(
  '/:id/status',
  authorize(Role.BENDAHARA),
  validateRequest(updateSpjStatusSchema),
  SpjController.verifySpj
);

export default router;
