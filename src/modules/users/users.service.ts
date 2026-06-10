import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/api-error';
import { Role } from '@prisma/client';
import { CreateUserInput } from './users.schema';

export class UsersService {
  /**
   * Get list of users inside the same Paroki with filters
   */
  static async getUsers(
    parokiId: string,
    filters: { search?: string; role?: Role; isActive?: boolean }
  ) {
    const whereClause: any = {
      parokiId,
    };

    // Apply active status filter
    if (filters.isActive !== undefined) {
      whereClause.isActive = filters.isActive;
    }

    // Apply role filter
    if (filters.role !== undefined) {
      whereClause.role = filters.role;
    }

    // Apply search filter (name or email, case-insensitive)
    if (filters.search) {
      whereClause.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { email: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const users = await prisma.user.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        parokiId: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    return users;
  }

  /**
   * Register a new user inside the same Paroki
   */
  static async createUser(
    parokiId: string,
    actorId: string,
    input: CreateUserInput['body']
  ) {
    // 1. Check if email is already taken
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw ApiError.badRequest('Email is already registered');
    }

    // 2. Hash password
    const hashedPassword = await bcrypt.hash(input.password, 10);

    // 3. Create user
    const newUser = await prisma.user.create({
      data: {
        email: input.email,
        name: input.name,
        password: hashedPassword,
        role: input.role,
        isActive: input.isActive !== undefined ? input.isActive : true,
        parokiId,
      },
    });

    // 4. Log the action to audit logs
    await prisma.auditLog.create({
      data: {
        type: 'AUTH',
        action: `Created new user account: ${newUser.name} with role ${newUser.role}`,
        actorId,
        parokiId,
      },
    });

    // 5. Exclude password from returned object
    const { password, ...userWithoutPassword } = newUser;
    return userWithoutPassword;
  }

  /**
   * Toggle user active status
   */
  static async toggleUserStatus(
    parokiId: string,
    actorId: string,
    targetId: string,
    isActive: boolean
  ) {
    // 1. Prevent self-deactivation
    if (actorId === targetId) {
      throw ApiError.badRequest('You cannot modify your own active status');
    }

    // 2. Retrieve user and verify they exist and belong to the same Paroki
    const user = await prisma.user.findUnique({
      where: { id: targetId },
    });

    if (!user) {
      throw ApiError.notFound('User account not found');
    }

    if (user.parokiId !== parokiId) {
      throw ApiError.forbidden('You do not have permission to modify users outside your Paroki');
    }

    // 3. Update status
    const updatedUser = await prisma.user.update({
      where: { id: targetId },
      data: { isActive },
    });

    // 4. Write audit log entry
    await prisma.auditLog.create({
      data: {
        type: 'AUTH',
        action: `Updated user ${updatedUser.name} active status to ${isActive ? 'ACTIVE' : 'INACTIVE'}`,
        actorId,
        parokiId,
      },
    });

    // 5. Exclude password
    const { password, ...userWithoutPassword } = updatedUser;
    return userWithoutPassword;
  }
}
