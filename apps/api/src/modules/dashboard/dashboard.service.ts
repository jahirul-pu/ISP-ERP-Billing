import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Executive KPIs — high-level business health metrics
   */
  async getExecutiveKpis() {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);

    // Run all queries in parallel
    const [
      totalCustomers,
      activeCustomers,
      lastMonthCustomers,
      onlineCustomers,
      currentMonthRevenue,
      lastMonthRevenue,
      currentMonthCollections,
      currentMonthInvoiced,
      totalDue,
      lastMonthTotalDue,
      openTickets,
      suspendedCustomers,
      leftCustomers,
      leftCustomersLastMonth,
    ] = await Promise.all([
      // Total customers (not LEFT or DEAD)
      this.prisma.customer.count({
        where: { status: { notIn: ['LEFT_CUSTOMER', 'DEAD_CONNECTION'] } },
      }),
      // Active customers
      this.prisma.customer.count({
        where: { status: 'ACTIVE' },
      }),
      // Customers as of last month (approximate via joinDate)
      this.prisma.customer.count({
        where: {
          joinDate: { lt: currentMonthStart },
          status: { notIn: ['LEFT_CUSTOMER', 'DEAD_CONNECTION'] },
        },
      }),
      // Online customers
      this.prisma.customer.count({
        where: { isOnline: true },
      }),
      // Current month revenue (paid invoices)
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: currentMonthStart } },
      }),
      // Last month revenue
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: {
          createdAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
      // Current month collections total
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { createdAt: { gte: currentMonthStart } },
      }),
      // Current month invoiced total
      this.prisma.invoice.aggregate({
        _sum: { total: true },
        where: { billingMonth: { gte: currentMonthStart } },
      }),
      // Total outstanding due across all customers
      this.prisma.customer.aggregate({
        _sum: { totalDue: true },
      }),
      // Last month total due (from invoices)
      this.prisma.invoice.aggregate({
        _sum: { dueAmount: true },
        where: {
          billingMonth: { gte: lastMonthStart, lte: lastMonthEnd },
          status: { in: ['UNPAID', 'PARTIALLY_PAID', 'OVERDUE'] },
        },
      }),
      // Open tickets
      this.prisma.ticket.count({
        where: { status: { in: ['OPEN', 'ASSIGNED', 'IN_PROGRESS'] } },
      }),
      // Suspended customers
      this.prisma.customer.count({
        where: { status: 'SUSPENDED' },
      }),
      // Left customers this month (churn)
      this.prisma.customer.count({
        where: {
          status: { in: ['LEFT_CUSTOMER', 'DEAD_CONNECTION'] },
          updatedAt: { gte: currentMonthStart },
        },
      }),
      // Left customers last month
      this.prisma.customer.count({
        where: {
          status: { in: ['LEFT_CUSTOMER', 'DEAD_CONNECTION'] },
          updatedAt: { gte: lastMonthStart, lte: lastMonthEnd },
        },
      }),
    ]);

    const revenue = currentMonthRevenue._sum.amount || 0;
    const prevRevenue = lastMonthRevenue._sum.amount || 0;
    const revenueChange = prevRevenue > 0 ? ((revenue - prevRevenue) / prevRevenue) * 100 : 0;

    const collected = currentMonthCollections._sum.amount || 0;
    const invoiced = currentMonthInvoiced._sum.total || 0;
    const collectionRate = invoiced > 0 ? (collected / invoiced) * 100 : 0;

    const totalDueAmount = totalDue._sum.totalDue || 0;
    const prevDue = lastMonthTotalDue._sum.dueAmount || 0;
    const dueChange = prevDue > 0 ? ((totalDueAmount - prevDue) / prevDue) * 100 : 0;

    const churnRate = lastMonthCustomers > 0
      ? (leftCustomers / lastMonthCustomers) * 100
      : 0;
    const prevChurnRate = lastMonthCustomers > 0
      ? (leftCustomersLastMonth / lastMonthCustomers) * 100
      : 0;

    const newCustomers = totalCustomers - (lastMonthCustomers || totalCustomers);

    return {
      totalCustomers: {
        value: totalCustomers,
        change: newCustomers,
        changeLabel: `+${newCustomers}`,
        trend: newCustomers >= 0 ? 'positive' : 'negative',
      },
      monthlyRevenue: {
        value: revenue,
        change: +revenueChange.toFixed(1),
        changeLabel: `${revenueChange >= 0 ? '+' : ''}${revenueChange.toFixed(1)}%`,
        trend: revenueChange >= 0 ? 'positive' : 'negative',
      },
      collectionRate: {
        value: +collectionRate.toFixed(1),
        change: +collectionRate.toFixed(1),
        changeLabel: `${collectionRate.toFixed(1)}%`,
        trend: collectionRate >= 75 ? 'positive' : 'negative',
      },
      totalDue: {
        value: totalDueAmount,
        change: +dueChange.toFixed(1),
        changeLabel: `${dueChange >= 0 ? '+' : ''}${dueChange.toFixed(1)}%`,
        trend: dueChange <= 0 ? 'positive' : 'negative',
      },
      onlineNow: {
        value: onlineCustomers,
        change: totalCustomers > 0 ? +((onlineCustomers / totalCustomers) * 100).toFixed(0) : 0,
        changeLabel: totalCustomers > 0 ? `${((onlineCustomers / totalCustomers) * 100).toFixed(0)}%` : '0%',
        trend: 'positive',
      },
      churnRate: {
        value: +churnRate.toFixed(1),
        change: +(churnRate - prevChurnRate).toFixed(1),
        changeLabel: `${churnRate - prevChurnRate >= 0 ? '+' : ''}${(churnRate - prevChurnRate).toFixed(1)}%`,
        trend: churnRate <= prevChurnRate ? 'positive' : 'negative',
      },
      activeCustomers,
      suspendedCustomers,
      openTickets,
    };
  }

  /**
   * Revenue & Collection trends — monthly time-series (last 12 months)
   */
  async getTrends(months: number = 12) {
    const now = new Date();
    const startDate = new Date(now.getFullYear(), now.getMonth() - months + 1, 1);

    // Get all payments grouped by month
    const payments = await this.prisma.payment.findMany({
      where: { createdAt: { gte: startDate } },
      select: { amount: true, createdAt: true },
    });

    // Get all invoices grouped by month
    const invoices = await this.prisma.invoice.findMany({
      where: { billingMonth: { gte: startDate } },
      select: { total: true, dueAmount: true, billingMonth: true },
    });

    // Get expenses grouped by month
    const expenses = await this.prisma.expense.findMany({
      where: { date: { gte: startDate } },
      select: { amount: true, date: true },
    });

    // Build month-by-month data
    const monthlyData: Array<{
      month: string;
      label: string;
      revenue: number;
      collections: number;
      expenses: number;
      profit: number;
      invoiced: number;
      due: number;
    }> = [];

    for (let i = 0; i < months; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - months + 1 + i, 1);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleString('en-US', { month: 'short', year: '2-digit' });

      const monthPayments = payments.filter((p) => {
        const pd = new Date(p.createdAt);
        return pd.getFullYear() === d.getFullYear() && pd.getMonth() === d.getMonth();
      });
      const monthInvoices = invoices.filter((inv) => {
        const id = new Date(inv.billingMonth);
        return id.getFullYear() === d.getFullYear() && id.getMonth() === d.getMonth();
      });
      const monthExpenses = expenses.filter((e) => {
        const ed = new Date(e.date);
        return ed.getFullYear() === d.getFullYear() && ed.getMonth() === d.getMonth();
      });

      const revenue = monthPayments.reduce((sum, p) => sum + p.amount, 0);
      const totalExpenses = monthExpenses.reduce((sum, e) => sum + e.amount, 0);
      const invoiced = monthInvoices.reduce((sum, inv) => sum + inv.total, 0);
      const due = monthInvoices.reduce((sum, inv) => sum + inv.dueAmount, 0);

      monthlyData.push({
        month: monthKey,
        label: monthLabel,
        revenue,
        collections: revenue,
        expenses: totalExpenses,
        profit: revenue - totalExpenses,
        invoiced,
        due,
      });
    }

    return monthlyData;
  }

  /**
   * Customer status distribution
   */
  async getCustomerStatusDistribution() {
    const statusCounts = await this.prisma.customer.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    return statusCounts.map((s) => ({
      status: s.status,
      count: s._count.id,
    }));
  }

  /**
   * Area-level performance stats
   */
  async getAreaStats() {
    const areas = await this.prisma.area.findMany({
      include: {
        customers: {
          select: {
            id: true,
            status: true,
            totalDue: true,
            isOnline: true,
            package: { select: { price: true } },
          },
        },
      },
    });

    return areas.map((area) => {
      const total = area.customers.length;
      const active = area.customers.filter((c) => c.status === 'ACTIVE').length;
      const online = area.customers.filter((c) => c.isOnline).length;
      const totalDue = area.customers.reduce((sum, c) => sum + c.totalDue, 0);
      const expectedRevenue = area.customers.reduce(
        (sum, c) => sum + (c.package?.price || 0),
        0,
      );

      return {
        id: area.id,
        name: area.name,
        code: area.code,
        totalCustomers: total,
        activeCustomers: active,
        onlineCustomers: online,
        totalDue,
        expectedRevenue,
        collectionRate: expectedRevenue > 0
          ? +((1 - totalDue / expectedRevenue) * 100).toFixed(1)
          : 100,
      };
    });
  }

  /**
   * Recent activity feed — last N events
   */
  async getRecentActivity(limit: number = 15) {
    // Fetch recent items from multiple tables in parallel
    const [payments, customers, tickets, syncLogs, invoices] = await Promise.all([
      this.prisma.payment.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { customer: { select: { customerId: true, name: true } } },
      }),
      this.prisma.customer.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { customerId: true, name: true, createdAt: true, area: { select: { name: true } } },
      }),
      this.prisma.ticket.findMany({
        take: limit,
        orderBy: { createdAt: 'desc' },
        select: { ticketNumber: true, subject: true, status: true, createdAt: true, updatedAt: true },
      }),
      this.prisma.syncLog.findMany({
        take: 5,
        orderBy: { startedAt: 'desc' },
        include: { router: { select: { name: true } } },
      }),
      this.prisma.invoice.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        select: { invoiceNumber: true, total: true, createdAt: true, customer: { select: { name: true } } },
      }),
    ]);

    // Merge into a unified activity feed
    const activities: Array<{
      type: string;
      text: string;
      time: Date;
    }> = [];

    for (const p of payments) {
      activities.push({
        type: 'payment',
        text: `Payment received from ${p.customer.customerId} — ৳${p.amount.toLocaleString()}`,
        time: p.createdAt,
      });
    }

    for (const c of customers) {
      activities.push({
        type: 'customer',
        text: `New customer registered: ${c.name} (${c.area?.name || 'N/A'})`,
        time: c.createdAt,
      });
    }

    for (const t of tickets) {
      if (t.status === 'RESOLVED' || t.status === 'CLOSED') {
        activities.push({
          type: 'ticket',
          text: `Ticket ${t.ticketNumber} ${t.status.toLowerCase()}: ${t.subject}`,
          time: t.updatedAt,
        });
      } else {
        activities.push({
          type: 'ticket',
          text: `Ticket ${t.ticketNumber} opened: ${t.subject}`,
          time: t.createdAt,
        });
      }
    }

    for (const s of syncLogs) {
      activities.push({
        type: 'sync',
        text: `MikroTik sync ${s.status.toLowerCase()} on ${s.router.name} — ${s.synced} users`,
        time: s.startedAt,
      });
    }

    for (const inv of invoices) {
      activities.push({
        type: 'billing',
        text: `Invoice ${inv.invoiceNumber} generated for ${inv.customer.name} — ৳${inv.total.toLocaleString()}`,
        time: inv.createdAt,
      });
    }

    // Sort by time descending and limit
    activities.sort((a, b) => b.time.getTime() - a.time.getTime());
    return activities.slice(0, limit).map((a) => ({
      ...a,
      timeAgo: this.timeAgo(a.time),
    }));
  }

  /**
   * Due customers list for dashboard table
   */
  async getDueCustomers(limit: number = 10) {
    return this.prisma.customer.findMany({
      where: {
        totalDue: { gt: 0 },
        status: { in: ['DUE_WARNING', 'GRACE_PERIOD', 'SUSPENDED'] },
      },
      orderBy: { totalDue: 'desc' },
      take: limit,
      include: {
        area: { select: { name: true } },
        package: { select: { name: true } },
      },
    });
  }

  /**
   * Package distribution (pie chart data)
   */
  async getPackageDistribution() {
    const distribution = await this.prisma.customer.groupBy({
      by: ['packageId'],
      _count: { id: true },
      where: {
        packageId: { not: null },
        status: { notIn: ['LEFT_CUSTOMER', 'DEAD_CONNECTION'] },
      },
    });

    // Enrich with package names
    const packageIds = distribution.map((d) => d.packageId).filter(Boolean) as string[];
    const packages = await this.prisma.package.findMany({
      where: { id: { in: packageIds } },
      select: { id: true, name: true },
    });

    const packageMap = new Map(packages.map((p) => [p.id, p.name]));

    return distribution.map((d) => ({
      packageId: d.packageId,
      packageName: packageMap.get(d.packageId!) || 'Unknown',
      count: d._count.id,
    }));
  }

  // ─── Helper ──────────────────────────────────
  private timeAgo(date: Date): string {
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
}
