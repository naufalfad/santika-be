import { Router } from 'express';
import { KasMasukController } from './kas-masuk.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import {
  createKasMasukSchema,
  updateKasMasukSchema,
  getKasMasukQuerySchema,
} from './kas-masuk.schema';
import { Role } from '@prisma/client';

const router = Router();

// Apply auth middleware globally to all Kas Masuk routes
router.use(authenticate);

// Routes with specific RBAC guards
router.get(
  '/',
  authorize(Role.BENDAHARA, Role.SEKRETARIAT),
  validateRequest(getKasMasukQuerySchema),
  KasMasukController.getKasMasuk
);

router.post(
  '/',
  authorize(Role.BENDAHARA, Role.SEKRETARIAT),
  validateRequest(createKasMasukSchema),
  KasMasukController.createKasMasuk
);

router.put(
  '/:id',
  authorize(Role.BENDAHARA, Role.SEKRETARIAT),
  validateRequest(updateKasMasukSchema),
  KasMasukController.updateKasMasuk
);

router.delete(
  '/:id',
  authorize(Role.BENDAHARA),
  KasMasukController.deleteKasMasuk
);

export default router;
