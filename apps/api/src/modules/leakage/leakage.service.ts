import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeakageService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Full leakage report — summary of all leakage types
   */
  async getLeakageReport() {
    const [unbilled, inactiveBilled, duplicates, unassigned] = await Promise.all([
      this.getUnbilledUsers(),
      this.getInactiveBilled(),
      this.getDuplicateBilling(),
      this.getUnassignedCollections(),
    ]);

    const totalLeakageAmount =
      unbilled.reduce((sum, u) => sum + (u.expectedRevenue || 0), 0) +
      inactiveBilled.reduce((sum, u) => sum + (u.billedAmount || 0), 0);

    return {
      summary: {
        unbilledCount: unbilled.length,
        inactiveBilledCount: inactiveBilled.length,
        duplicateCount: duplicates.length,
        unassignedCount: unassigned.length,
        totalIssues: unbilled.length + inactiveBilled.length + duplicates.length + unassigned.length,
        estimatedLeakage: totalLeakageAmount,
      },
      unbilledUsers: unbilled,
      inactiveBilled: inactiveBilled,
      duplicates: duplicates,
      unassignedCollections: unassigned,
      generatedAt: new Date(),
    };
  }

  /**
   * Active in MikroTik (has PPPoE username, marked online) but no invoice this month
   */
  async getUnbilledUsers() {
    const currentMonthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    // Customers who are active/online but have no invoice for current month
    const customers = await this.prisma.customer.findMany({
      where: {
        status: 'ACTIVE',
        pppoeUsername: { not: null },
        invoices: {
          none: {
            billingMonth: { gte: currentMonthStart },
          },
        },
      },
      include: {
        package: { select: { name: true, price: true } },
        area: { select: { name: true } },
        zone: { select: { name: true } },
        mikrotikRouter: { select: { name: true } },
      },
    });

    return customers.map((c) => ({
      id: c.id,
      customerId: c.customerId,
      name: c.name,
      phone: c.phone,
      pppoeUsername: c.pppoeUsername,
      area: c.area?.name,
      zone: c.zone?.name,
      router: c.mikrotikRouter?.name,
      packageName: c.package?.name,
      expectedRevenue: c.customPrice || c.package?.price || 0,
      isOnline: c.isOnline,
      lastSeen: c.lastSeen,
      issue: 'Active connection, no invoice generated this month',
    }));
  }

  /**
   * Billed customers who are not active in MikroTik
   * (no PPPoE username or not found in any router)
   */
  async getInactiveBilled() {
    const currentMonthStart = new Date(
      new Date().getFullYear(),
      new Date().getMonth(),
      1,
    );

    const customers = await this.prisma.customer.findMany({
      where: {
        OR: [
          { pppoeUsername: null },
          { isOnline: false, lastSeen: null },
        ],
        status: { in: ['ACTIVE', 'DUE_WARNING'] },
        invoices: {
          some: {
            billingMonth: { gte: currentMonthStart },
            status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
          },
        },
      },
      include: {
        package: { select: { name: true, price: true } },
        area: { select: { name: true } },
        invoices: {
          where: { billingMonth: { gte: currentMonthStart } },
          select: { invoiceNumber: true, total: true, status: true },
          take: 1,
        },
      },
    });

    return customers.map((c) => ({
      id: c.id,
      customerId: c.customerId,
      name: c.name,
      phone: c.phone,
      pppoeUsername: c.pppoeUsername,
      area: c.area?.name,
      packageName: c.package?.name,
      billedAmount: c.invoices[0]?.total || 0,
      invoiceNumber: c.invoices[0]?.invoiceNumber,
      invoiceStatus: c.invoices[0]?.status,
      isOnline: c.isOnline,
      lastSeen: c.lastSeen,
      issue: 'Invoice generated but no active MikroTik connection found',
    }));
  }

  /**
   * Customers with duplicate billing — multiple invoices for the same billing month
   */
  async getDuplicateBilling() {
    // Find billing months with more than 1 invoice per customer
    const duplicates = await this.prisma.$queryRawUnsafe<
      Array<{ customerId: string; billingMonth: string; count: number }>
    >(`
      SELECT "customerId", "billingMonth", COUNT(*) as count
      FROM invoices
      WHERE status NOT IN ('CANCELLED', 'WAIVED')
      GROUP BY "customerId", "billingMonth"
      HAVING COUNT(*) > 1
      ORDER BY count DESC
      LIMIT 50
    `);

    if (duplicates.length === 0) return [];

    const customerIds = [...new Set(duplicates.map((d) => d.customerId))];
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: customerIds } },
      select: {
        id: true,
        customerId: true,
        name: true,
        phone: true,
        area: { select: { name: true } },
      },
    });

    const customerMap = new Map(customers.map((c) => [c.id, c]));

    return duplicates.map((d) => {
      const customer = customerMap.get(d.customerId);
      return {
        customerId: customer?.customerId,
        name: customer?.name,
        phone: customer?.phone,
        area: customer?.area?.name,
        billingMonth: d.billingMonth,
        duplicateCount: Number(d.count),
        issue: `${d.count} invoices found for the same billing period`,
      };
    });
  }

  /**
   * Collections/payments that are not linked to any invoice
   */
  async getUnassignedCollections() {
    const payments = await this.prisma.payment.findMany({
      where: {
        invoiceId: null,
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        customer: {
          select: {
            customerId: true,
            name: true,
            area: { select: { name: true } },
          },
        },
        collector: { select: { name: true } },
      },
    });

    return payments.map((p) => ({
      id: p.id,
      receiptNumber: p.receiptNumber,
      customerId: p.customer.customerId,
      customerName: p.customer.name,
      area: p.customer.area?.name,
      amount: p.amount,
      method: p.method,
      collector: p.collector?.name,
      date: p.createdAt,
      issue: 'Payment not linked to any invoice',
    }));
  }
}
