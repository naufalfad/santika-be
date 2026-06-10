import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ApiError } from '../utils/api-error';

/**
 * Middleware to restrict route access to specific user roles.
 * Must be placed after the authenticate middleware.
 */
export const authorize = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('User not authenticated'));
    }

    const userRole = req.user.role as Role;

    if (!allowedRoles.includes(userRole)) {
      return next(ApiError.forbidden(`Access denied: Insufficient permissions for role ${userRole}`));
    }

    next();
  };
};
