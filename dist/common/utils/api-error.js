"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ApiError = void 0;
class ApiError extends Error {
    statusCode;
    constructor(statusCode, message) {
        super(message);
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, new.target.prototype);
    }
    static badRequest(msg) {
        return new ApiError(400, msg);
    }
    static unauthorized(msg = 'Unauthorized access') {
        return new ApiError(401, msg);
    }
    static forbidden(msg = 'Access denied') {
        return new ApiError(403, msg);
    }
    static notFound(msg = 'Resource not found') {
        return new ApiError(404, msg);
    }
    static internal(msg = 'Internal server error') {
        return new ApiError(500, msg);
    }
}
exports.ApiError = ApiError;
