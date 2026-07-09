"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserSchema = exports.getUsersQuerySchema = exports.toggleUserStatusSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
const client_1 = require("@prisma/client");
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email('Invalid email format'),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters'),
        name: zod_1.z.string().min(2, 'Name must be at least 2 characters'),
        role: zod_1.z.nativeEnum(client_1.Role, {
            message: 'Invalid role. Must be one of the defined system roles',
        }),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.toggleUserStatusSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid user ID format'),
    }),
    body: zod_1.z.object({
        isActive: zod_1.z.boolean({
            message: 'isActive status is required',
        }),
    }),
});
exports.getUsersQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        search: zod_1.z.string().optional(),
        role: zod_1.z.nativeEnum(client_1.Role).optional(),
        isActive: zod_1.z
            .string()
            .optional()
            .transform((val) => {
            if (val === 'true')
                return true;
            if (val === 'false')
                return false;
            return undefined;
        }),
    }),
});
exports.updateUserSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid user ID format'),
    }),
    body: zod_1.z.object({
        name: zod_1.z.string().min(2, 'Name must be at least 2 characters').optional(),
        password: zod_1.z.string().min(6, 'Password must be at least 6 characters').optional(),
    }).refine((data) => data.name !== undefined || data.password !== undefined, {
        message: 'Either name or password must be provided',
        path: ['name', 'password'],
    }),
});
