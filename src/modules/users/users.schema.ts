import { z } from 'zod';
import { Role } from '@prisma/client';

export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z.string().min(6, 'Password must be at least 6 characters'),
    name: z.string().min(2, 'Name must be at least 2 characters'),
    role: z.nativeEnum(Role, {
      message: 'Invalid role. Must be one of the defined system roles',
    }),
    isActive: z.boolean().optional(),
  }),
});

export const toggleUserStatusSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    isActive: z.boolean({
      message: 'isActive status is required',
    }),
  }),
});

export const getUsersQuerySchema = z.object({
  query: z.object({
    search: z.string().optional(),
    role: z.nativeEnum(Role).optional(),
    isActive: z
      .string()
      .optional()
      .transform((val) => {
        if (val === 'true') return true;
        if (val === 'false') return false;
        return undefined;
      }),
  }),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type ToggleUserStatusInput = z.infer<typeof toggleUserStatusSchema>;
export type GetUsersQueryInput = z.infer<typeof getUsersQuerySchema>;

export const updateUserSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').optional(),
    password: z.string().min(6, 'Password must be at least 6 characters').optional(),
  }).refine((data) => data.name !== undefined || data.password !== undefined, {
    message: 'Either name or password must be provided',
    path: ['name', 'password'],
  }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

