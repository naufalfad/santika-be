import { Router } from 'express';
import { SpecialFundController } from './special-fund.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import {
  createSpecialFundSchema,
  updateSpecialFundSchema,
  allocateSpecialFundSchema
} from './special-fund.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Allow SUPER_ADMIN, PASTOR, BENDAHARA, DEWAN_KEUANGAN to view list and details
router.get(
  '/',
  authorize(Role.SUPER_ADMIN, Role.PASTOR, Role.BENDAHARA, Role.DEWAN_KEUANGAN),
  SpecialFundController.getSpecialFunds
);

router.get(
  '/:id',
  authorize(Role.SUPER_ADMIN, Role.PASTOR, Role.BENDAHARA, Role.DEWAN_KEUANGAN),
  SpecialFundController.getSpecialFundById
);

router.get(
  '/:id/transactions',
  authorize(Role.SUPER_ADMIN, Role.PASTOR, Role.BENDAHARA, Role.DEWAN_KEUANGAN),
  SpecialFundController.getSpecialFundTransactions
);

router.get(
  '/:id/report',
  authorize(Role.SUPER_ADMIN, Role.PASTOR, Role.BENDAHARA, Role.DEWAN_KEUANGAN),
  SpecialFundController.getSpecialFundReport
);

// Creation, update, deletion, activation, close, allocation are restricted to BENDAHARA and SUPER_ADMIN
router.post(
  '/',
  authorize(Role.SUPER_ADMIN, Role.BENDAHARA),
  validateRequest(createSpecialFundSchema),
  SpecialFundController.createSpecialFund
);

router.put(
  '/:id',
  authorize(Role.SUPER_ADMIN, Role.BENDAHARA),
  validateRequest(updateSpecialFundSchema),
  SpecialFundController.updateSpecialFund
);

router.delete(
  '/:id',
  authorize(Role.SUPER_ADMIN, Role.BENDAHARA),
  SpecialFundController.deleteSpecialFund
);

router.post(
  '/:id/activate',
  authorize(Role.SUPER_ADMIN, Role.BENDAHARA),
  SpecialFundController.activateSpecialFund
);

router.post(
  '/:id/close',
  authorize(Role.SUPER_ADMIN, Role.BENDAHARA),
  SpecialFundController.closeSpecialFund
);

router.post(
  '/:id/allocate',
  authorize(Role.SUPER_ADMIN, Role.BENDAHARA),
  validateRequest(allocateSpecialFundSchema),
  SpecialFundController.allocateRemainingBalance
);

export default router;
