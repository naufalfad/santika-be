"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogController = void 0;
const audit_log_service_1 = require("./audit-log.service");
class AuditLogController {
    static async getLogs(req, res, next) {
        try {
            const parokiId = req.user.parokiId;
            const filters = {
                search: req.query.search,
                type: req.query.type,
                page: req.query.page ? parseInt(req.query.page, 10) : undefined,
                limit: req.query.limit ? parseInt(req.query.limit, 10) : undefined,
            };
            const result = await audit_log_service_1.AuditLogService.getLogs(parokiId, filters);
            res.status(200).json({
                status: 'success',
                data: result,
            });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.AuditLogController = AuditLogController;
