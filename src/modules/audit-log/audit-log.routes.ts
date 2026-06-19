import { Router } from 'express';
import { AuditLogController } from './audit-log.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { Role } from '@prisma/client';

const router = Router();

// Secure route: only logged in SUPER_ADMIN, PASTOR, and BENDAHARA can view audit logs
router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN, Role.PASTOR, Role.BENDAHARA));

router.get('/', AuditLogController.getLogs);

export default router;
