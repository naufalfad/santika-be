import { Router } from 'express';
import { IncomeTypeController } from './income-type.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { createIncomeTypeSchema, updateIncomeTypeSchema } from './income-type.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN),
  IncomeTypeController.getIncomeTypes
);

router.post(
  '/',
  authorize(Role.BENDAHARA),
  validateRequest(createIncomeTypeSchema),
  IncomeTypeController.createIncomeType
);

router.put(
  '/:id',
  authorize(Role.BENDAHARA),
  validateRequest(updateIncomeTypeSchema),
  IncomeTypeController.updateIncomeType
);

router.delete(
  '/:id',
  authorize(Role.BENDAHARA),
  IncomeTypeController.deleteIncomeType
);

export default router;
