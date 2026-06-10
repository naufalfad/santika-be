"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
const token_util_1 = require("../../common/utils/token.util");
class AuthService {
    /**
     * Log in user and generate access/refresh tokens
     */
    static async login(input) {
        const user = await database_1.prisma.user.findUnique({
            where: { email: input.email },
            include: { paroki: true },
        });
        if (!user) {
            throw api_error_1.ApiError.badRequest('Invalid email or password');
        }
        if (!user.isActive) {
            throw api_error_1.ApiError.forbidden('Your account has been deactivated. Please contact the administrator.');
        }
        // Compare passwords
        const isPasswordValid = await bcryptjs_1.default.compare(input.password, user.password);
        if (!isPasswordValid) {
            throw api_error_1.ApiError.badRequest('Invalid email or password');
        }
        // Generate tokens
        const accessToken = (0, token_util_1.signAccessToken)({
            id: user.id,
            email: user.email,
            role: user.role,
            parokiId: user.parokiId,
        });
        const refreshToken = (0, token_util_1.signRefreshToken)({
            id: user.id,
        });
        // Create an audit log for successful login
        await database_1.prisma.auditLog.create({
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
    static async refresh(refreshToken) {
        try {
            const decoded = (0, token_util_1.verifyRefreshToken)(refreshToken);
            const user = await database_1.prisma.user.findUnique({
                where: { id: decoded.id },
                include: { paroki: true },
            });
            if (!user) {
                throw api_error_1.ApiError.unauthorized('User not found');
            }
            if (!user.isActive) {
                throw api_error_1.ApiError.forbidden('User account is deactivated');
            }
            const newAccessToken = (0, token_util_1.signAccessToken)({
                id: user.id,
                email: user.email,
                role: user.role,
                parokiId: user.parokiId,
            });
            const newRefreshToken = (0, token_util_1.signRefreshToken)({
                id: user.id,
            });
            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
            };
        }
        catch (error) {
            throw api_error_1.ApiError.unauthorized('Invalid or expired refresh token');
        }
    }
    /**
     * Get currently logged-in user profile details
     */
    static async getCurrentUser(userId) {
        const user = await database_1.prisma.user.findUnique({
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
            throw api_error_1.ApiError.notFound('User not found');
        }
        if (!user.isActive) {
            throw api_error_1.ApiError.forbidden('Account is deactivated');
        }
        // Exclude password
        const { password, ...userProfile } = user;
        return userProfile;
    }
}
exports.AuthService = AuthService;
