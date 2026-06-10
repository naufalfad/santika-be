import { Router } from 'express';
import { KasKeluarController } from './kas-keluar.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { multerUpload } from '../../common/middleware/upload.middleware';
import {
  createKasKeluarSchema,
  updateKasKeluarSchema,
  getKasKeluarQuerySchema,
} from './kas-keluar.schema';
import { Role } from '@prisma/client';

const router = Router();

// Apply auth middleware globally to all Kas Keluar routes
router.use(authenticate);

// Routes with specific RBAC guards and middlewares
router.get(
  '/',
  authorize(Role.BENDAHARA, Role.KETUA_KOMISI),
  validateRequest(getKasKeluarQuerySchema),
  KasKeluarController.getKasKeluar
);

router.post(
  '/',
  authorize(Role.BENDAHARA, Role.KETUA_KOMISI),
  multerUpload.single('file'),
  validateRequest(createKasKeluarSchema),
  KasKeluarController.createKasKeluar
);

router.put(
  '/:id',
  authorize(Role.BENDAHARA),
  multerUpload.single('file'),
  validateRequest(updateKasKeluarSchema),
  KasKeluarController.updateKasKeluar
);

router.delete(
  '/:id',
  authorize(Role.BENDAHARA),
  KasKeluarController.deleteKasKeluar
);

export default router;
