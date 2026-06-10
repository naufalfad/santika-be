"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = void 0;
const token_util_1 = require("../utils/token.util");
const api_error_1 = require("../utils/api-error");
require("../types");
const authenticate = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return next(api_error_1.ApiError.unauthorized('Authorization header is missing'));
        }
        const parts = authHeader.split(' ');
        if (parts.length !== 2 || parts[0] !== 'Bearer') {
            return next(api_error_1.ApiError.unauthorized('Authorization header format must be Bearer <token>'));
        }
        const token = parts[1];
        const decoded = (0, token_util_1.verifyAccessToken)(token);
        req.user = decoded;
        next();
    }
    catch (error) {
        if (error.name === 'TokenExpiredError') {
            return next(api_error_1.ApiError.unauthorized('Access token has expired'));
        }
        return next(api_error_1.ApiError.unauthorized('Invalid access token'));
    }
};
exports.authenticate = authenticate;
