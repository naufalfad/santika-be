"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogService = void 0;
const database_1 = require("../../config/database");
class AuditLogService {
    /**
     * Get list of audit logs for the paroki with filters and pagination
     */
    static async getLogs(parokiId, filters) {
        const page = filters.page || 1;
        const limit = filters.limit || 50;
        const skip = (page - 1) * limit;
        const whereClause = {
            parokiId,
        };
        // Filter by action type
        if (filters.type && filters.type !== 'ALL') {
            whereClause.type = filters.type;
        }
        // Apply search filter (actor name or action content, case-insensitive)
        if (filters.search) {
            whereClause.OR = [
                { action: { contains: filters.search, mode: 'insensitive' } },
                {
                    actor: {
                        name: { contains: filters.search, mode: 'insensitive' },
                    },
                },
            ];
        }
        // Get logs count for pagination metadata
        const totalLogs = await database_1.prisma.auditLog.count({
            where: whereClause,
        });
        const logs = await database_1.prisma.auditLog.findMany({
            where: whereClause,
            orderBy: { tanggal: 'desc' },
            skip,
            take: limit,
            include: {
                actor: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                    },
                },
            },
        });
        return {
            logs,
            pagination: {
                totalItems: totalLogs,
                totalPages: Math.ceil(totalLogs / limit),
                currentPage: page,
                itemsPerPage: limit,
            },
        };
    }
}
exports.AuditLogService = AuditLogService;
