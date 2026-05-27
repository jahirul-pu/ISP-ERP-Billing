import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { GenerateBillsDto } from './dto/generate-bills.dto';
import { createPaginationMeta, generateId } from '@isp-erp/shared';
import { Prisma, InvoiceStatus, BillComponentType } from '@isp-erp/database';

@Injectable()
export class BillingService {
  constructor(private prisma: PrismaService) {}

  async findAll(filter: InvoiceFilterDto) {
    const { page = 1, limit = 20, search, status, customerId, billingMonth } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.InvoiceWhereInput = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status;
    }

    if (billingMonth) {
      const [year, month] = billingMonth.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month)) {
        where.billingMonth = new Date(Date.UTC(year, month - 1, 1));
      }
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search } },
        {
          customer: {
            OR: [
              { name: { contains: search } },
              { customerId: { contains: search } },
              { pppoeUsername: { contains: search } },
            ],
          },
        },
      ];
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        include: {
          customer: {
            select: {
              id: true,
              customerId: true,
              name: true,
              phone: true,
              pppoeUsername: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOne(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        customer: {
          select: {
            id: true,
            customerId: true,
            name: true,
            phone: true,
            address: true,
            pppoeUsername: true,
            advanceBalance: true,
            totalDue: true,
          },
        },
        items: true,
        payments: true,
      },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async create(dto: CreateInvoiceDto) {
    const { customerId, billingMonth, dueDate, notes, items } = dto;

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Set billing month to the first day of that month
    const startOfBillingMonth = new Date(Date.UTC(
      billingMonth.getUTCFullYear(),
      billingMonth.getUTCMonth(),
      1
    ));

    // Calculate billing component totals
    let subtotal = 0;
    let tax = 0;
    let discount = 0;
    let penalty = 0;
    let waiver = 0;

    for (const item of items) {
      const itemTotal = item.amount * (item.quantity ?? 1);
      switch (item.type) {
        case BillComponentType.VAT_TAX:
          tax += itemTotal;
          break;
        case BillComponentType.DISCOUNT:
          discount += itemTotal;
          break;
        case BillComponentType.PENALTY:
          penalty += itemTotal;
          break;
        case BillComponentType.WAIVER:
          waiver += itemTotal;
          break;
        default:
          subtotal += itemTotal;
          break;
      }
    }

    const total = Math.max(0, subtotal + tax + penalty - discount - waiver);

    // Reconcile with advance balance
    let paidAmount = 0;
    let dueAmount = total;
    let status: InvoiceStatus = InvoiceStatus.UNPAID;
    let advanceReduction = 0;

    if (customer.advanceBalance > 0 && total > 0) {
      if (customer.advanceBalance >= total) {
        paidAmount = total;
        dueAmount = 0;
        status = InvoiceStatus.PAID;
        advanceReduction = total;
      } else {
        paidAmount = customer.advanceBalance;
        dueAmount = total - customer.advanceBalance;
        status = InvoiceStatus.PARTIALLY_PAID;
        advanceReduction = customer.advanceBalance;
      }
    }

    // Execute database changes in transaction
    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Increment sequence counter
      const counter = await tx.sequenceCounter.update({
        where: { name: 'invoice_number' },
        data: { current: { increment: 1 } },
      });

      const invoiceNumber = generateId('INV', counter.current);

      // 2. Create invoice and items
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          billingMonth: startOfBillingMonth,
          subtotal,
          tax,
          discount,
          penalty,
          waiver,
          total,
          paidAmount,
          dueAmount,
          status,
          dueDate,
          notes,
          items: {
            create: items.map((item) => ({
              type: item.type,
              description: item.description,
              amount: item.amount,
              quantity: item.quantity ?? 1,
              total: item.amount * (item.quantity ?? 1),
            })),
          },
        },
        include: {
          items: true,
        },
      });

      // 3. Update customer financial status
      await tx.customer.update({
        where: { id: customerId },
        data: {
          advanceBalance: { decrement: advanceReduction },
          totalDue: { increment: dueAmount },
        },
      });

      return createdInvoice;
    });

    return result;
  }

  async update(id: string, dto: UpdateInvoiceDto) {
    const { status, dueDate, notes } = dto;

    const invoice = await this.findOne(id);

    // Calculate changes if status changes
    let statusUpdate: InvoiceStatus | undefined = status;
    let dueAmountUpdate = invoice.dueAmount;
    let paidAmountUpdate = invoice.paidAmount;

    let customerDueAdjustment = 0; // Negative means reduce, Positive means increase

    if (status && status !== invoice.status) {
      // Transitioning away from UNPAID / PARTIALLY_PAID to a resolved state (WAIVED / CANCELLED)
      if (
        (invoice.status === InvoiceStatus.UNPAID || invoice.status === InvoiceStatus.PARTIALLY_PAID || invoice.status === InvoiceStatus.OVERDUE) &&
        (status === InvoiceStatus.WAIVED || status === InvoiceStatus.CANCELLED)
      ) {
        customerDueAdjustment = -invoice.dueAmount;
        dueAmountUpdate = 0;
      }
      // Re-activating a cancelled or waived invoice to unpaid
      else if (
        (invoice.status === InvoiceStatus.WAIVED || invoice.status === InvoiceStatus.CANCELLED) &&
        (status === InvoiceStatus.UNPAID || status === InvoiceStatus.OVERDUE)
      ) {
        dueAmountUpdate = invoice.total - invoice.paidAmount;
        customerDueAdjustment = dueAmountUpdate;
      }
      // Marking unpaid invoice as PAID manually without adding a Payment record directly
      else if (
        (invoice.status === InvoiceStatus.UNPAID || invoice.status === InvoiceStatus.PARTIALLY_PAID || invoice.status === InvoiceStatus.OVERDUE) &&
        status === InvoiceStatus.PAID
      ) {
        customerDueAdjustment = -invoice.dueAmount;
        paidAmountUpdate = invoice.total;
        dueAmountUpdate = 0;
      }
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedInvoice = await tx.invoice.update({
        where: { id },
        data: {
          status: statusUpdate,
          dueDate,
          notes,
          dueAmount: dueAmountUpdate,
          paidAmount: paidAmountUpdate,
        },
        include: {
          items: true,
        },
      });

      if (customerDueAdjustment !== 0) {
        await tx.customer.update({
          where: { id: invoice.customerId },
          data: {
            totalDue: { increment: customerDueAdjustment },
          },
        });
      }

      return updatedInvoice;
    });

    return updated;
  }

  async generateMonthlyBills(dto: GenerateBillsDto) {
    const { billingMonth, dueDate } = dto;
    const [year, month] = billingMonth.split('-').map(Number);
    const billingMonthDate = new Date(Date.UTC(year, month - 1, 1));

    // Get all billable customers
    const customers = await this.prisma.customer.findMany({
      where: {
        status: {
          in: ['ACTIVE', 'DUE_WARNING', 'GRACE_PERIOD'],
        },
        packageId: { not: null },
      },
      include: {
        package: true,
      },
    });

    let successCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    const details: string[] = [];

    for (const customer of customers) {
      try {
        // Double billing check: Check if an invoice already exists for this client for this billing month
        const existingInvoice = await this.prisma.invoice.findFirst({
          where: {
            customerId: customer.id,
            billingMonth: billingMonthDate,
            status: { not: InvoiceStatus.CANCELLED },
          },
        });

        if (existingInvoice) {
          skippedCount++;
          details.push(`Skipped customer ${customer.customerId} (${customer.name}): Invoice already exists.`);
          continue;
        }

        const packagePrice = customer.customPrice ?? customer.package?.price ?? 0;
        const description = `${customer.package?.name || 'Internet Package'} - ${customer.package?.bandwidth || ''} (Recurring Monthly Bill)`;

        // Create the invoice
        await this.create({
          customerId: customer.id,
          billingMonth: billingMonthDate,
          dueDate,
          notes: `Auto-generated monthly bill for ${billingMonth}`,
          items: [
            {
              type: BillComponentType.INTERNET_PACKAGE,
              description,
              amount: packagePrice,
              quantity: 1,
            },
          ],
        });

        successCount++;
      } catch (err: any) {
        failedCount++;
        details.push(`Failed to generate bill for ${customer.customerId} (${customer.name}): ${err.message}`);
      }
    }

    return {
      success: true,
      stats: {
        totalTargeted: customers.length,
        generated: successCount,
        skipped: skippedCount,
        failed: failedCount,
      },
      details,
    };
  }

  async getStats() {
    const [totalInvoices, paidInvoices, unpaidInvoices, overdueInvoices] = await Promise.all([
      this.prisma.invoice.findMany({
        where: { status: { not: InvoiceStatus.CANCELLED } },
        select: { total: true, paidAmount: true, dueAmount: true },
      }),
      this.prisma.invoice.findMany({
        where: { status: InvoiceStatus.PAID },
        select: { total: true },
      }),
      this.prisma.invoice.findMany({
        where: { status: InvoiceStatus.UNPAID },
        select: { dueAmount: true },
      }),
      this.prisma.invoice.findMany({
        where: { status: InvoiceStatus.OVERDUE },
        select: { dueAmount: true },
      }),
    ]);

    const totalInvoiced = totalInvoices.reduce((sum, inv) => sum + inv.total, 0);
    const totalCollected = totalInvoices.reduce((sum, inv) => sum + inv.paidAmount, 0);
    const totalOutstanding = totalInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);
    const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);

    const counts = await this.prisma.invoice.groupBy({
      by: ['status'],
      _count: true,
    });

    const statusCounts = counts.reduce((acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    }, {} as Record<string, number>);

    return {
      financials: {
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        totalOverdue,
      },
      counts: {
        total: totalInvoices.length,
        paid: statusCounts[InvoiceStatus.PAID] ?? 0,
        unpaid: statusCounts[InvoiceStatus.UNPAID] ?? 0,
        partiallyPaid: statusCounts[InvoiceStatus.PARTIALLY_PAID] ?? 0,
        overdue: statusCounts[InvoiceStatus.OVERDUE] ?? 0,
        waived: statusCounts[InvoiceStatus.WAIVED] ?? 0,
        cancelled: statusCounts[InvoiceStatus.CANCELLED] ?? 0,
      },
    };
  }
}
