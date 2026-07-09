"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const database_1 = require("../../config/database");
const api_error_1 = require("../../common/utils/api-error");
class UsersService {
    /**
     * Get list of users inside the same Paroki with filters
     */
    static async getUsers(parokiId, filters) {
        const whereClause = {
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
        const users = await database_1.prisma.user.findMany({
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
    static async createUser(parokiId, actorId, input) {
        // 1. Check if email is already taken
        const existingUser = await database_1.prisma.user.findUnique({
            where: { email: input.email },
        });
        if (existingUser) {
            throw api_error_1.ApiError.badRequest('Email is already registered');
        }
        // 2. Hash password
        const hashedPassword = await bcryptjs_1.default.hash(input.password, 10);
        // 3. Create user
        const newUser = await database_1.prisma.user.create({
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
        await database_1.prisma.auditLog.create({
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
    static async toggleUserStatus(parokiId, actorId, targetId, isActive) {
        // 1. Prevent self-deactivation
        if (actorId === targetId) {
            throw api_error_1.ApiError.badRequest('You cannot modify your own active status');
        }
        // 2. Retrieve user and verify they exist and belong to the same Paroki
        const user = await database_1.prisma.user.findUnique({
            where: { id: targetId },
        });
        if (!user) {
            throw api_error_1.ApiError.notFound('User account not found');
        }
        if (user.parokiId !== parokiId) {
            throw api_error_1.ApiError.forbidden('You do not have permission to modify users outside your Paroki');
        }
        // 3. Update status
        const updatedUser = await database_1.prisma.user.update({
            where: { id: targetId },
            data: { isActive },
        });
        // 4. Write audit log entry
        await database_1.prisma.auditLog.create({
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
    static async updateUser(parokiId, actorId, targetId, input) {
        // 1. Verify target user exists and belongs to the same paroki
        const targetUser = await database_1.prisma.user.findFirst({
            where: { id: targetId, parokiId },
        });
        if (!targetUser) {
            throw api_error_1.ApiError.notFound('User not found or does not belong to your Paroki');
        }
        const updateData = {};
        const auditDetails = [];
        if (input.name) {
            updateData.name = input.name;
            auditDetails.push(`changed name from "${targetUser.name}" to "${input.name}"`);
        }
        if (input.password) {
            const hashedPassword = await bcryptjs_1.default.hash(input.password, 10);
            updateData.password = hashedPassword;
            auditDetails.push('reset password');
        }
        if (Object.keys(updateData).length === 0) {
            throw api_error_1.ApiError.badRequest('No data provided to update');
        }
        // 2. Perform update
        const updatedUser = await database_1.prisma.user.update({
            where: { id: targetId },
            data: updateData,
        });
        // 3. Log action to audit logs
        await database_1.prisma.auditLog.create({
            data: {
                type: 'AUTH',
                action: `Updated user account (${updatedUser.email}): ${auditDetails.join(' and ')}`,
                actorId,
                parokiId,
            },
        });
        // 4. Return user without password
        const { password, ...userWithoutPassword } = updatedUser;
        return userWithoutPassword;
    }
}
exports.UsersService = UsersService;
