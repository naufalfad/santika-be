import { Router } from 'express';
import { ExpenseTypeController } from './expense-type.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { createExpenseTypeSchema, updateExpenseTypeSchema } from './expense-type.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

router.get(
  '/',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN),
  ExpenseTypeController.getExpenseTypes
);

router.post(
  '/',
  authorize(Role.BENDAHARA),
  validateRequest(createExpenseTypeSchema),
  ExpenseTypeController.createExpenseType
);

router.put(
  '/:id',
  authorize(Role.BENDAHARA),
  validateRequest(updateExpenseTypeSchema),
  ExpenseTypeController.updateExpenseType
);

router.delete(
  '/:id',
  authorize(Role.BENDAHARA),
  ExpenseTypeController.deleteExpenseType
);

export default router;
