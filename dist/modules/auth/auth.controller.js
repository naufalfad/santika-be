"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("./auth.service");
class AuthController {
    static async login(req, res, next) {
        try {
            const result = await auth_service_1.AuthService.login(req.body);
            res.status(200).json({
                status: 'success',
                message: 'Login successful',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async refresh(req, res, next) {
        try {
            const result = await auth_service_1.AuthService.refresh(req.body.refreshToken);
            res.status(200).json({
                status: 'success',
                message: 'Token refreshed successfully',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
    static async me(req, res, next) {
        try {
            // req.user is guaranteed to be set if the authenticate middleware runs
            const userId = req.user.id;
            const userProfile = await auth_service_1.AuthService.getCurrentUser(userId);
            res.status(200).json({
                status: 'success',
                data: {
                    user: userProfile,
                },
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuthController = AuthController;
