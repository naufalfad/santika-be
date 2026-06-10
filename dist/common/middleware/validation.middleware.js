"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRequest = void 0;
const zod_1 = require("zod");
const validateRequest = (schema) => {
    return async (req, res, next) => {
        try {
            const parsed = (await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            }));
            // Mutate express request with parsed and transformed values
            if (parsed.body !== undefined) {
                req.body = parsed.body;
            }
            if (parsed.query !== undefined) {
                Object.defineProperty(req, 'query', {
                    value: parsed.query,
                    writable: true,
                    configurable: true,
                    enumerable: true
                });
            }
            if (parsed.params !== undefined) {
                Object.defineProperty(req, 'params', {
                    value: parsed.params,
                    writable: true,
                    configurable: true,
                    enumerable: true
                });
            }
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const errorMessages = error.issues.map((issue) => ({
                    path: issue.path.join('.'),
                    message: issue.message,
                }));
                return res.status(400).json({
                    status: 'error',
                    statusCode: 400,
                    message: 'Validation failed',
                    errors: errorMessages,
                });
            }
            next(error);
        }
    };
};
exports.validateRequest = validateRequest;
