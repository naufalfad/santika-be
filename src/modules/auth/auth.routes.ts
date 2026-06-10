import { Router } from 'express';
import { AuthController } from './auth.controller';
import { validateRequest } from '../../common/middleware/validation.middleware';
import { loginSchema, refreshSchema } from './auth.schema';
import { authenticate } from '../../common/middleware/auth.middleware';

const router = Router();

router.post('/login', validateRequest(loginSchema), AuthController.login);
router.post('/refresh', validateRequest(refreshSchema), AuthController.refresh);
router.get('/me', authenticate, AuthController.me);

export default router;
