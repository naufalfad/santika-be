import { Request, Response, NextFunction } from 'express';
import { UsersService } from './users.service';
import { Role } from '@prisma/client';

export class UsersController {
  static async getUsers(req: Request, res: Response, next: NextFunction) {
    try {
      // req.user is guaranteed to be set by the authentication middleware
      const parokiId = req.user!.parokiId;
      const filters = {
        search: req.query.search as string | undefined,
        role: req.query.role as Role | undefined,
        // isActive is already transformed to boolean or undefined by zod validation middleware
        isActive: req.query.isActive as boolean | undefined,
      };

      const users = await UsersService.getUsers(parokiId, filters);

      res.status(200).json({
        status: 'success',
        data: {
          users,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async createUser(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;

      const newUser = await UsersService.createUser(parokiId, actorId, req.body);

      res.status(201).json({
        status: 'success',
        message: 'User created successfully',
        data: {
          user: newUser,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  static async toggleUserStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const parokiId = req.user!.parokiId;
      const actorId = req.user!.id;
      const targetId = req.params.id as string;
      const { isActive } = req.body;

      const updatedUser = await UsersService.toggleUserStatus(
        parokiId,
        actorId,
        targetId,
        isActive
      );

      res.status(200).json({
        status: 'success',
        message: `User status updated successfully`,
        data: {
          user: updatedUser,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}
