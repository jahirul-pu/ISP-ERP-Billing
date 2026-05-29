import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemFilterDto } from './dto/item-filter.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { createPaginationMeta } from '@isp-erp/shared';
import { Prisma } from '@isp-erp/database';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: ItemFilterDto) {
    const { page = 1, limit = 20, search, type, condition, popId, isAssigned } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.InventoryItemWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { serialNumber: { contains: search } },
      ];
    }

    if (type) where.type = type;
    if (condition) where.condition = condition;
    if (popId) where.popId = popId;

    if (isAssigned !== undefined) {
      if (isAssigned) {
        where.assignments = { some: { returnedAt: null } };
      } else {
        where.assignments = { none: { returnedAt: null } };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.inventoryItem.findMany({
        where,
        skip,
        take: limit,
        include: {
          pop: { select: { id: true, name: true } },
          assignments: {
            where: { returnedAt: null },
            include: { customer: { select: { id: true, name: true, customerId: true } } },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.inventoryItem.count({ where }),
    ]);

    const formattedData = items.map((item) => {
      const activeAssignment = item.assignments[0] || null;
      return {
        ...item,
        isAssigned: !!activeAssignment,
        activeAssignment,
      };
    });

    return {
      data: formattedData,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const item = await this.prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        pop: true,
        movements: { orderBy: { createdAt: 'desc' } },
        assignments: {
          orderBy: { assignedAt: 'desc' },
          include: { customer: { select: { id: true, name: true, customerId: true, phone: true } } },
        },
      },
    });

    if (!item) throw new NotFoundException('Inventory item not found');

    const activeAssignment = item.assignments.find((a) => !a.returnedAt) || null;

    return {
      ...item,
      isAssigned: !!activeAssignment,
      activeAssignment,
    };
  }

  async create(dto: CreateItemDto, performedBy: string) {
    if (dto.serialNumber) {
      const existing = await this.prisma.inventoryItem.findUnique({
        where: { serialNumber: dto.serialNumber },
      });
      if (existing) throw new ConflictException('Serial number already exists in inventory');
    }

    const item = await this.prisma.inventoryItem.create({
      data: {
        name: dto.name,
        type: dto.type,
        serialNumber: dto.serialNumber || null,
        condition: dto.condition || 'NEW',
        quantity: dto.quantity !== undefined ? dto.quantity : 1,
        supplier: dto.supplier || null,
        purchaseDate: dto.purchaseDate || null,
        purchasePrice: dto.purchasePrice || null,
        popId: dto.popId || null,
      },
    });

    // Create initial stock in movement
    await this.prisma.stockMovement.create({
      data: {
        itemId: item.id,
        type: 'STOCK_IN',
        quantity: item.quantity,
        remarks: 'Initial stock entry',
        performedBy,
      },
    });

    return this.findOne(item.id);
  }

  async update(id: string, dto: UpdateItemDto) {
    const current = await this.findOne(id);

    if (dto.serialNumber && dto.serialNumber !== current.serialNumber) {
      const existing = await this.prisma.inventoryItem.findUnique({
        where: { serialNumber: dto.serialNumber },
      });
      if (existing) throw new ConflictException('Serial number already exists in inventory');
    }

    await this.prisma.inventoryItem.update({
      where: { id },
      data: {
        name: dto.name,
        type: dto.type,
        serialNumber: dto.serialNumber,
        condition: dto.condition,
        quantity: dto.quantity,
        supplier: dto.supplier,
        purchaseDate: dto.purchaseDate,
        purchasePrice: dto.purchasePrice,
        popId: dto.popId,
      },
    });

    return this.findOne(id);
  }

  async recordMovement(itemId: string, dto: StockMovementDto, performedBy: string) {
    const item = await this.findOne(itemId);

    // Adjust quantity in inventory item
    let newQty = item.quantity;
    if (dto.type === 'STOCK_IN' || dto.type === 'REPAIRED') {
      newQty += dto.quantity;
    } else if (dto.type === 'STOCK_OUT' || dto.type === 'DAMAGED') {
      newQty = Math.max(0, newQty - dto.quantity);
    }

    // Determine new condition if type dictates it
    let newCondition = item.condition;
    if (dto.type === 'DAMAGED') newCondition = 'DAMAGED';
    if (dto.type === 'REPAIRED') newCondition = 'GOOD';

    await this.prisma.$transaction([
      this.prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: newQty, condition: newCondition },
      }),
      this.prisma.stockMovement.create({
        data: {
          itemId,
          type: dto.type,
          quantity: dto.quantity,
          remarks: dto.remarks || null,
          performedBy,
        },
      }),
    ]);

    return this.findOne(itemId);
  }

  async assignToCustomer(itemId: string, dto: AssignAssetDto, performedBy: string) {
    const item = await this.findOne(itemId);

    if (item.isAssigned) {
      throw new ConflictException('Hardware item is already assigned to a customer');
    }

    if (item.quantity <= 0) {
      throw new ConflictException('Item is out of stock');
    }

    await this.prisma.$transaction([
      // Decrement stock quantity by 1 for assignments
      this.prisma.inventoryItem.update({
        where: { id: itemId },
        data: { quantity: Math.max(0, item.quantity - 1) },
      }),
      // Create asset assignment
      this.prisma.customerAsset.create({
        data: {
          customerId: dto.customerId,
          itemId,
          condition: item.condition,
          remarks: dto.remarks || null,
        },
      }),
      // Create stock movement
      this.prisma.stockMovement.create({
        data: {
          itemId,
          type: 'ASSIGNED',
          quantity: 1,
          remarks: dto.remarks || 'Assigned to client',
          performedBy,
        },
      }),
    ]);

    return this.findOne(itemId);
  }

  async returnFromCustomer(assignmentId: string, dto: ReturnAssetDto, performedBy: string) {
    const assignment = await this.prisma.customerAsset.findUnique({
      where: { id: assignmentId },
    });

    if (!assignment) throw new NotFoundException('Asset assignment not found');
    if (assignment.returnedAt) throw new ConflictException('Asset was already returned');

    await this.prisma.$transaction([
      // Update customer asset record
      this.prisma.customerAsset.update({
        where: { id: assignmentId },
        data: {
          returnedAt: new Date(),
          condition: dto.condition,
          remarks: dto.remarks || null,
        },
      }),
      // Update inventory item stock level and condition
      this.prisma.inventoryItem.update({
        where: { id: assignment.itemId },
        data: {
          quantity: { increment: 1 },
          condition: dto.condition,
        },
      }),
      // Create return stock movement
      this.prisma.stockMovement.create({
        data: {
          itemId: assignment.itemId,
          type: 'RETURNED',
          quantity: 1,
          remarks: dto.remarks || 'Returned from client',
          performedBy,
        },
      }),
    ]);

    return this.findOne(assignment.itemId);
  }

  async getStats() {
    const [totalItems, assignedCount, typeBreakdown, conditionBreakdown] = await Promise.all([
      this.prisma.inventoryItem.count(),
      this.prisma.customerAsset.count({ where: { returnedAt: null } }),
      this.prisma.inventoryItem.groupBy({
        by: ['type'],
        _sum: { quantity: true },
      }),
      this.prisma.inventoryItem.groupBy({
        by: ['condition'],
        _count: true,
      }),
    ]);

    const stats = {
      total: totalItems,
      assigned: assignedCount,
      inStock: Math.max(0, totalItems - assignedCount),
      types: { ROUTER: 0, ONU: 0, SWITCH: 0, CABLE: 0, SPLICE_BOX: 0, BATTERY: 0, OTHER: 0 },
      conditions: { NEW: 0, GOOD: 0, DAMAGED: 0, REPAIR: 0, DISPOSED: 0 },
    };

    typeBreakdown.forEach((t) => {
      if (t.type in stats.types) {
        stats.types[t.type as keyof typeof stats.types] = t._sum.quantity || 0;
      }
    });

    conditionBreakdown.forEach((c) => {
      if (c.condition in stats.conditions) {
        stats.conditions[c.condition as keyof typeof stats.conditions] = c._count;
      }
    });

    return stats;
  }
}
