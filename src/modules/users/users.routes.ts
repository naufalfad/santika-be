import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../common/middleware/auth.middleware';
import { authorize } from '../../common/guards/rbac.guard';
import { validateRequest } from '../../common/middleware/validation.middleware';
import {
  createUserSchema,
  toggleUserStatusSchema,
  getUsersQuerySchema,
} from './users.schema';
import { Role } from '@prisma/client';

const router = Router();

// Apply auth middlewares globally to all user routes
router.use(authenticate);
router.use(authorize(Role.SUPER_ADMIN));

// Routes
router.get('/', validateRequest(getUsersQuerySchema), UsersController.getUsers);
router.post('/', validateRequest(createUserSchema), UsersController.createUser);
router.patch('/:id/status', validateRequest(toggleUserStatusSchema), UsersController.toggleUserStatus);

export default router;
