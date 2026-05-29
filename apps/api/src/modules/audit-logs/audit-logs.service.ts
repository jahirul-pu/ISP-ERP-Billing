import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';

@Injectable()
export class AuditLogsService {
  private readonly logger = new Logger(AuditLogsService.name);

  constructor(private prisma: PrismaService) {}

  async create(data: {
    userId?: string | null;
    action: string;
    entity: string;
    entityId?: string | null;
    oldValues?: any;
    newValues?: any;
    ipAddress?: string | null;
    userAgent?: string | null;
  }) {
    try {
      let resolvedUserId = data.userId || null;
      if (resolvedUserId) {
        const userExists = await this.prisma.user.findUnique({
          where: { id: resolvedUserId },
          select: { id: true },
        });
        if (!userExists) {
          resolvedUserId = null;
        }
      }

      return await this.prisma.auditLog.create({
        data: {
          userId: resolvedUserId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId || null,
          oldValues: data.oldValues || null,
          newValues: data.newValues || null,
          ipAddress: data.ipAddress || null,
          userAgent: data.userAgent || null,
        },
      });
    } catch (err) {
      this.logger.error('Failed to create audit log, falling back to null relation log', err);
      try {
        return await this.prisma.auditLog.create({
          data: {
            userId: null,
            action: data.action,
            entity: data.entity,
            entityId: data.entityId || null,
            oldValues: data.oldValues || null,
            newValues: data.newValues || null,
            ipAddress: data.ipAddress || null,
            userAgent: data.userAgent || null,
          },
        });
      } catch (fallbackErr) {
        this.logger.error('Audit log fallback failed entirely!', fallbackErr);
      }
    }
  }

  async findAll(filter: AuditLogFilterDto) {
    const page = Number(filter.page) || 1;
    const limit = Number(filter.limit) || 15;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (filter.action) {
      where.action = filter.action;
    }

    if (filter.entity) {
      where.entity = filter.entity;
    }

    if (filter.userId) {
      where.userId = filter.userId;
    }

    if (filter.search?.trim()) {
      const searchTerm = filter.search.trim();
      where.OR = [
        { ipAddress: { contains: searchTerm } },
        { entityId: { contains: searchTerm } },
        { user: { email: { contains: searchTerm } } },
        { user: { name: { contains: searchTerm } } },
      ];
    }

    const [total, data] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              name: true,
              role: {
                select: {
                  displayName: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async getStats() {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [total, mutations, security, activeUsersRaw, activeIpsRaw] = await Promise.all([
      this.prisma.auditLog.count(),
      this.prisma.auditLog.count({
        where: {
          action: { in: ['CREATE', 'UPDATE', 'DELETE'] },
        },
      }),
      this.prisma.auditLog.count({
        where: {
          action: 'LOGIN',
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          createdAt: { gte: startOfToday },
          userId: { not: null },
        },
      }),
      this.prisma.auditLog.groupBy({
        by: ['ipAddress'],
        where: {
          createdAt: { gte: startOfToday },
          ipAddress: { not: null },
        },
      }),
    ]);

    return {
      success: true,
      data: {
        total,
        mutations,
        security,
        activeUsers: activeUsersRaw.length,
        activeIps: activeIpsRaw.length,
      },
    };
  }
}
