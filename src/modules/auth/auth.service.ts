import bcrypt from 'bcryptjs';
import { prisma } from '../../config/database';
import { ApiError } from '../../common/utils/api-error';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../common/utils/token.util';
import { LoginInput } from './auth.schema';

export class AuthService {
  /**
   * Log in user and generate access/refresh tokens
   */
  static async login(input: LoginInput['body']) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
      include: { paroki: true },
    });

    if (!user) {
      throw ApiError.badRequest('Invalid email or password');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Your account has been deactivated. Please contact the administrator.');
    }

    // Compare passwords
    const isPasswordValid = await bcrypt.compare(input.password, user.password);
    if (!isPasswordValid) {
      throw ApiError.badRequest('Invalid email or password');
    }

    // Generate tokens
    const accessToken = signAccessToken({
      id: user.id,
      email: user.email,
      role: user.role,
      parokiId: user.parokiId,
    });

    const refreshToken = signRefreshToken({
      id: user.id,
    });

    // Create an audit log for successful login
    await prisma.auditLog.create({
      data: {
        type: 'AUTH',
        action: `User ${user.name} logged in successfully`,
        actorId: user.id,
        parokiId: user.parokiId,
      },
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        paroki: {
          id: user.paroki.id,
          nama: user.paroki.nama,
        },
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  /**
   * Refresh access token using a valid refresh token
   */
  static async refresh(refreshToken: string) {
    try {
      const decoded = verifyRefreshToken(refreshToken);

      const user = await prisma.user.findUnique({
        where: { id: decoded.id },
        include: { paroki: true },
      });

      if (!user) {
        throw ApiError.unauthorized('User not found');
      }

      if (!user.isActive) {
        throw ApiError.forbidden('User account is deactivated');
      }

      const newAccessToken = signAccessToken({
        id: user.id,
        email: user.email,
        role: user.role,
        parokiId: user.parokiId,
      });

      const newRefreshToken = signRefreshToken({
        id: user.id,
      });

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      throw ApiError.unauthorized('Invalid or expired refresh token');
    }
  }

  /**
   * Get currently logged-in user profile details
   */
  static async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        paroki: {
          select: {
            id: true,
            nama: true,
            alamat: true,
            keuskupan: true,
          },
        },
      },
    });

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    if (!user.isActive) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Exclude password
    const { password, ...userProfile } = user;
    return userProfile;
  }
}
