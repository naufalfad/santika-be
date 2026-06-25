import { Router } from 'express';
import { CashTransactionController } from './cash-transaction.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { multerUpload } from '../../common/middleware/upload.middleware';
import {
  createIncomeSchema,
  createExpenseSchema,
  getCashTransactionsQuerySchema,
  auditTransactionSchema,
} from './cash-transaction.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// --- INCOMES ---
router.get(
  '/incomes',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN, Role.SEKRETARIAT),
  validateRequest(getCashTransactionsQuerySchema),
  CashTransactionController.getIncomes
);

router.get(
  '/incomes/:id',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN, Role.SEKRETARIAT),
  CashTransactionController.getIncomeById
);

router.post(
  '/incomes',
  authorize(Role.BENDAHARA, Role.SEKRETARIAT),
  validateRequest(createIncomeSchema),
  CashTransactionController.createIncome
);

// --- EXPENSES ---
router.get(
  '/expenses',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN, Role.KETUA_KOMISI),
  validateRequest(getCashTransactionsQuerySchema),
  CashTransactionController.getExpenses
);

router.get(
  '/expenses/:id',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.DEWAN_KEUANGAN, Role.KETUA_KOMISI),
  CashTransactionController.getExpenseById
);

router.post(
  '/expenses',
  authorize(Role.BENDAHARA, Role.KETUA_KOMISI),
  multerUpload.single('file'),
  validateRequest(createExpenseSchema),
  CashTransactionController.createExpense
);

// --- AUDIT ---
router.put(
  '/transactions/:id/audit',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.SUPER_ADMIN),
  validateRequest(auditTransactionSchema),
  CashTransactionController.auditTransaction
);

export default router;
