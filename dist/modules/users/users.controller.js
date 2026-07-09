"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const users_service_1 = require("./users.service");
class UsersController {
    static async getUsers(req, res, next) {
        try {
            // req.user is guaranteed to be set by the authentication middleware
            const parokiId = req.user.parokiId;
            const filters = {
                search: req.query.search,
                role: req.query.role,
                // isActive is already transformed to boolean or undefined by zod validation middleware
                isActive: req.query.isActive,
            };
            const users = await users_service_1.UsersService.getUsers(parokiId, filters);
            res.status(200).json({
                status: 'success',
                data: {
                    users,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async createUser(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const newUser = await users_service_1.UsersService.createUser(parokiId, actorId, req.body);
            res.status(201).json({
                status: 'success',
                message: 'User created successfully',
                data: {
                    user: newUser,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async toggleUserStatus(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const targetId = req.params.id;
            const { isActive } = req.body;
            const updatedUser = await users_service_1.UsersService.toggleUserStatus(parokiId, actorId, targetId, isActive);
            res.status(200).json({
                status: 'success',
                message: `User status updated successfully`,
                data: {
                    user: updatedUser,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async updateUser(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const actorId = req.user.id;
            const targetId = req.params.id;
            const updatedUser = await users_service_1.UsersService.updateUser(parokiId, actorId, targetId, req.body);
            res.status(200).json({
                status: 'success',
                message: 'User account updated successfully',
                data: {
                    user: updatedUser,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.UsersController = UsersController;
