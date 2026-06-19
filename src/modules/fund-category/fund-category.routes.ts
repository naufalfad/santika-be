import { Router } from 'express';
import { FundCategoryController } from './fund-category.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { createFundCategorySchema, updateFundCategorySchema, transferFundCategoryBalanceSchema } from './fund-category.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// Balances endpoint must be registered before /:id parameter match
router.get(
  '/balances',
  authorize(Role.SUPER_ADMIN, Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN),
  FundCategoryController.getFundBalances
);

router.get(
  '/',
  authorize(Role.SUPER_ADMIN, Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN),
  FundCategoryController.getFundCategories
);

router.post(
  '/',
  authorize(Role.BENDAHARA),
  validateRequest(createFundCategorySchema),
  FundCategoryController.createFundCategory
);

router.post(
  '/transfer',
  authorize(Role.BENDAHARA, Role.SUPER_ADMIN),
  validateRequest(transferFundCategoryBalanceSchema),
  FundCategoryController.transferBalance
);

router.put(
  '/:id',
  authorize(Role.BENDAHARA),
  validateRequest(updateFundCategorySchema),
  FundCategoryController.updateFundCategory
);

router.delete(
  '/:id',
  authorize(Role.BENDAHARA),
  FundCategoryController.deleteFundCategory
);

export default router;
