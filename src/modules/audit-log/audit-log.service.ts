import { prisma } from '../../config/database';

export interface GetAuditLogsFilters {
  search?: string;
  type?: string;
  page?: number;
  limit?: number;
}

export class AuditLogService {
  /**
   * Get list of audit logs for the paroki with filters and pagination
   */
  static async getLogs(parokiId: string, filters: GetAuditLogsFilters) {
    const page = filters.page || 1;
    const limit = filters.limit || 50;
    const skip = (page - 1) * limit;

    const whereClause: any = {
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
    const totalLogs = await prisma.auditLog.count({
      where: whereClause,
    });

    const logs = await prisma.auditLog.findMany({
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
