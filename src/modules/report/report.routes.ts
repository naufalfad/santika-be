import { Router } from 'express';
import { ReportController } from './report.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { getReportQuerySchema, getBudgetReportQuerySchema } from './report.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.PASTOR, Role.BENDAHARA, Role.DEWAN_KEUANGAN));

router.get('/bku', validateRequest(getReportQuerySchema), ReportController.getBkuReport);
router.get('/cash-flow', validateRequest(getReportQuerySchema), ReportController.getCashFlowReport);
router.get('/budget-realisation', validateRequest(getBudgetReportQuerySchema), ReportController.getBudgetRealisationReport);

export default router;
