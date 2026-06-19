import { Router } from 'express';
import { AnggaranController } from './anggaran.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import {
  createAnggaranSchema,
  updateAnggaranSchema,
  getAnggaranQuerySchema,
} from './anggaran.schema';
import { Role } from '@prisma/client';

const router = Router();

// Apply auth middleware globally to all Anggaran routes
router.use(authenticate);

// Budget Dashboard
router.get(
  '/dashboard',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN),
  AnggaranController.getAnggaranDashboard
);

router.get(
  '/komisi',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN, Role.KETUA_KOMISI),
  AnggaranController.getKomisi
);

// CRUD routes
router.get(
  '/',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN),
  validateRequest(getAnggaranQuerySchema),
  AnggaranController.getAnggaran
);

router.post(
  '/',
  authorize(Role.BENDAHARA),
  validateRequest(createAnggaranSchema),
  AnggaranController.createAnggaran
);

router.put(
  '/:id',
  authorize(Role.BENDAHARA),
  validateRequest(updateAnggaranSchema),
  AnggaranController.updateAnggaran
);

export default router;
