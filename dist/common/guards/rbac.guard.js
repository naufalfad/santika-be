"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authorize = void 0;
const api_error_1 = require("../utils/api-error");
/**
 * Middleware to restrict route access to specific user roles.
 * Must be placed after the authenticate middleware.
 */
const authorize = (...allowedRoles) => {
    return (req, res, next) => {
        if (!req.user) {
            return next(api_error_1.ApiError.unauthorized('User not authenticated'));
        }
        const userRole = req.user.role;
        if (!allowedRoles.includes(userRole)) {
            return next(api_error_1.ApiError.forbidden(`Access denied: Insufficient permissions for role ${userRole}`));
        }
        next();
    };
};
exports.authorize = authorize;
