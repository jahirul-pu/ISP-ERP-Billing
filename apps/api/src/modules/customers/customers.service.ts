import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { createPaginationMeta, generateId } from '@isp-erp/shared';
import { Prisma } from '@isp-erp/database';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: CustomerFilterDto) {
    const { page = 1, limit = 20, search, status, type, areaId, zoneId, collectorId, isOnline } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { customerId: { contains: search } },
        { pppoeUsername: { contains: search } },
      ];
    }
    if (status) where.status = status as any;
    if (type) where.type = type as any;
    if (areaId) where.areaId = areaId;
    if (zoneId) where.zoneId = zoneId;
    if (collectorId) where.collectorId = collectorId;
    if (isOnline !== undefined) where.isOnline = isOnline;

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        include: {
          area: { select: { name: true } },
          zone: { select: { name: true } },
          pop: { select: { name: true } },
          package: { select: { name: true, bandwidth: true, price: true } },
          collector: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.customer.count({ where }),
    ]);

    return {
      data: customers,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const customer = await this.prisma.customer.findUnique({
      where: { id },
      include: {
        area: true,
        zone: true,
        pop: true,
        package: true,
        collector: { select: { id: true, name: true, email: true, phone: true } },
        notes: { orderBy: { createdAt: 'desc' }, take: 10 },
        _count: {
          select: { invoices: true, payments: true, tickets: true, assets: true },
        },
      },
    });
    if (!customer) throw new NotFoundException('Customer not found');
    return customer;
  }

  async create(dto: CreateCustomerDto) {
    // Check for duplicate phone
    if (dto.pppoeUsername) {
      const existing = await this.prisma.customer.findUnique({
        where: { pppoeUsername: dto.pppoeUsername },
      });
      if (existing) throw new ConflictException('PPPoE username already exists');
    }

    // Generate customer ID
    const counter = await this.prisma.sequenceCounter.update({
      where: { name: 'customer_id' },
      data: { current: { increment: 1 } },
    });
    const customerId = generateId('ISP', counter.current);

    return this.prisma.customer.create({
      data: {
        ...dto,
        customerId,
      } as any,
      include: {
        area: { select: { name: true } },
        zone: { select: { name: true } },
        pop: { select: { name: true } },
        package: { select: { name: true, bandwidth: true, price: true } },
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: dto as any,
      include: {
        area: { select: { name: true } },
        zone: { select: { name: true } },
        pop: { select: { name: true } },
        package: { select: { name: true, bandwidth: true, price: true } },
      },
    });
  }

  async updateStatus(id: string, status: string) {
    await this.findOne(id);
    return this.prisma.customer.update({
      where: { id },
      data: { status: status as any },
    });
  }

  async addNote(customerId: string, content: string, category?: string, createdBy?: string) {
    await this.findOne(customerId);
    return this.prisma.customerNote.create({
      data: { customerId, content, category, createdBy },
    });
  }

  async getNotes(customerId: string) {
    return this.prisma.customerNote.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getStats() {
    const [total, active, suspended, due] = await Promise.all([
      this.prisma.customer.count(),
      this.prisma.customer.count({ where: { status: 'ACTIVE' } }),
      this.prisma.customer.count({ where: { status: 'SUSPENDED' } }),
      this.prisma.customer.count({ where: { totalDue: { gt: 0 } } }),
    ]);
    return { total, active, suspended, withDue: due };
  }
}
