import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { createPaginationMeta, generateId } from '@isp-erp/shared';
import { Prisma } from '@isp-erp/database';

@Injectable()
export class TicketsService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: TicketFilterDto) {
    const { page = 1, limit = 20, search, status, priority, type, customerId, assignedToId } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {};

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search } },
        { subject: { contains: search } },
        { description: { contains: search } },
        { customer: { name: { contains: search } } },
        { customer: { customerId: { contains: search } } },
      ];
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (type) where.type = type;
    if (customerId) where.customerId = customerId;
    if (assignedToId) where.assignedToId = assignedToId;

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: { id: true, customerId: true, name: true, phone: true, area: { select: { name: true } } },
          },
          assignedTo: {
            select: { id: true, name: true, email: true },
          },
          createdBy: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return {
      data: tickets,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        customer: {
          include: {
            area: true,
            zone: true,
            pop: true,
            package: true,
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true, phone: true },
        },
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) throw new NotFoundException('Ticket not found');

    const authorIds = Array.from(new Set(ticket.comments.map((c) => c.authorId).filter(Boolean)));
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds as string[] } },
      select: { id: true, name: true },
    });
    const authorMap = new Map(authors.map((a) => [a.id, a.name]));

    const commentsWithAuthor = ticket.comments.map((c) => ({
      ...c,
      authorName: c.authorId ? authorMap.get(c.authorId) || 'Deleted User' : 'System',
    }));

    return {
      ...ticket,
      comments: commentsWithAuthor,
    };
  }

  async create(dto: CreateTicketDto, createdById: string) {
    const counter = await this.prisma.sequenceCounter.update({
      where: { name: 'ticket_number' },
      data: { current: { increment: 1 } },
    });
    const ticketNumber = generateId('TKT', counter.current);

    const initialStatus = dto.assignedToId ? 'ASSIGNED' : 'OPEN';

    return this.prisma.ticket.create({
      data: {
        ticketNumber,
        subject: dto.subject,
        description: dto.description,
        type: dto.type,
        priority: dto.priority || 'MEDIUM',
        status: initialStatus,
        customerId: dto.customerId,
        assignedToId: dto.assignedToId || null,
        createdById,
      },
      include: {
        customer: { select: { id: true, name: true, customerId: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  async update(id: string, dto: UpdateTicketDto) {
    const currentTicket = await this.findOne(id);

    const data: Prisma.TicketUpdateInput = {
      subject: dto.subject,
      description: dto.description,
      priority: dto.priority,
      type: dto.type,
      resolution: dto.resolution,
    };

    if (dto.assignedToId !== undefined) {
      if (dto.assignedToId) {
        data.assignedTo = { connect: { id: dto.assignedToId } };
      } else {
        data.assignedTo = { disconnect: true };
      }
      if (dto.assignedToId && currentTicket.status === 'OPEN' && !dto.status) {
        data.status = 'ASSIGNED';
      }
    }

    if (dto.status) {
      data.status = dto.status;
      if (dto.status === 'RESOLVED') {
        data.resolvedAt = new Date();
      } else if (dto.status === 'CLOSED') {
        data.closedAt = new Date();
      }
    }

    return this.prisma.ticket.update({
      where: { id },
      data,
      include: {
        customer: { select: { id: true, name: true, customerId: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
  }

  async addComment(ticketId: string, dto: CreateCommentDto, authorId: string) {
    await this.findOne(ticketId);

    const author = await this.prisma.user.findUnique({
      where: { id: authorId },
      select: { name: true },
    });

    const comment = await this.prisma.ticketComment.create({
      data: {
        ticketId,
        content: dto.content,
        isInternal: dto.isInternal || false,
        authorId,
      },
    });

    return {
      ...comment,
      authorName: author?.name || 'Unknown Author',
    };
  }

  async getComments(ticketId: string) {
    await this.findOne(ticketId);

    const comments = await this.prisma.ticketComment.findMany({
      where: { ticketId },
      orderBy: { createdAt: 'asc' },
    });

    const authorIds = Array.from(new Set(comments.map((c) => c.authorId).filter(Boolean)));
    const authors = await this.prisma.user.findMany({
      where: { id: { in: authorIds as string[] } },
      select: { id: true, name: true },
    });

    const authorMap = new Map(authors.map((a) => [a.id, a.name]));

    return comments.map((c) => ({
      ...c,
      authorName: c.authorId ? authorMap.get(c.authorId) || 'Deleted User' : 'System',
    }));
  }

  async getStats() {
    const [statusCounts, priorityCounts, typeCounts] = await Promise.all([
      this.prisma.ticket.groupBy({
        by: ['status'],
        _count: true,
      }),
      this.prisma.ticket.groupBy({
        by: ['priority'],
        _count: true,
      }),
      this.prisma.ticket.groupBy({
        by: ['type'],
        _count: true,
      }),
    ]);

    const stats = {
      status: { OPEN: 0, ASSIGNED: 0, IN_PROGRESS: 0, RESOLVED: 0, CLOSED: 0 },
      priority: { LOW: 0, MEDIUM: 0, HIGH: 0, URGENT: 0 },
      type: { TECHNICAL: 0, BILLING: 0, SERVICE_REQUEST: 0 },
    };

    statusCounts.forEach((c) => {
      if (c.status in stats.status) {
        stats.status[c.status as keyof typeof stats.status] = c._count;
      }
    });

    priorityCounts.forEach((c) => {
      if (c.priority in stats.priority) {
        stats.priority[c.priority as keyof typeof stats.priority] = c._count;
      }
    });

    typeCounts.forEach((c) => {
      if (c.type in stats.type) {
        stats.type[c.type as keyof typeof stats.type] = c._count;
      }
    });

    return stats;
  }
}
