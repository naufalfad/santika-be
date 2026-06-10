"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateFundCategorySchema = exports.createFundCategorySchema = void 0;
const zod_1 = require("zod");
exports.createFundCategorySchema = zod_1.z.object({
    body: zod_1.z.object({
        code: zod_1.z
            .string({ message: 'Code is required' })
            .min(2, 'Code must be at least 2 characters')
            .toUpperCase(),
        name: zod_1.z.string({ message: 'Name is required' }).min(2, 'Name must be at least 2 characters'),
        description: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.updateFundCategorySchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid category ID format'),
    }),
    body: zod_1.z.object({
        code: zod_1.z
            .string()
            .min(2, 'Code must be at least 2 characters')
            .toUpperCase()
            .optional(),
        name: zod_1.z.string().min(2, 'Name must be at least 2 characters').optional(),
        description: zod_1.z.string().optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
