import { Router } from 'express';
import { KegiatanController } from './kegiatan.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { multerUpload } from '../../common/middleware/upload.middleware';
import { createKegiatanSchema, updateKegiatanStatusSchema } from './kegiatan.schema';
import { Role } from '@prisma/client';

const router = Router();

router.use(authenticate);

// List activities
router.get('/', KegiatanController.getKegiatan);

// Get single activity detail
router.get('/:id', KegiatanController.getKegiatanById);

// Submit or create a new activity proposal (Ketua Komisi only, support files)
router.post(
  '/',
  authorize(Role.KETUA_KOMISI, Role.SUPER_ADMIN),
  multerUpload.array('files', 10),
  validateRequest(createKegiatanSchema),
  KegiatanController.createKegiatan
);

// Review activity status (Bendahara or Pastor)
router.patch(
  '/:id/status',
  authorize(Role.BENDAHARA, Role.PASTOR, Role.SUPER_ADMIN),
  validateRequest(updateKegiatanStatusSchema),
  KegiatanController.updateKegiatanStatus
);

export default router;
