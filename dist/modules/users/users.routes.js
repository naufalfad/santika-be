"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const users_controller_1 = require("./users.controller");
const auth_middleware_1 = require("../../common/middleware/auth.middleware");
const rbac_guard_1 = require("../../common/guards/rbac.guard");
const validation_middleware_1 = require("../../common/middleware/validation.middleware");
const users_schema_1 = require("./users.schema");
const client_1 = require("@prisma/client");
const router = (0, express_1.Router)();
// Apply auth middlewares globally to all user routes
router.use(auth_middleware_1.authenticate);
router.use((0, rbac_guard_1.authorize)(client_1.Role.SUPER_ADMIN));
// Routes
router.get('/', (0, validation_middleware_1.validateRequest)(users_schema_1.getUsersQuerySchema), users_controller_1.UsersController.getUsers);
router.post('/', (0, validation_middleware_1.validateRequest)(users_schema_1.createUserSchema), users_controller_1.UsersController.createUser);
router.patch('/:id/status', (0, validation_middleware_1.validateRequest)(users_schema_1.toggleUserStatusSchema), users_controller_1.UsersController.toggleUserStatus);
router.patch('/:id', (0, validation_middleware_1.validateRequest)(users_schema_1.updateUserSchema), users_controller_1.UsersController.updateUser);
exports.default = router;
