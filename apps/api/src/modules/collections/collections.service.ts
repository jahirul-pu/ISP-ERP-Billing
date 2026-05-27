import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { CashbookFilterDto } from './dto/cashbook-filter.dto';
import { ReconcileCollectionDto } from './dto/reconcile-collection.dto';
import { SubmitCashbookDto } from './dto/submit-cashbook.dto';
import { ReconcileCashbookDto } from './dto/reconcile-cashbook.dto';
import { createPaginationMeta, generateId } from '@isp-erp/shared';
import { Prisma, CollectionStatus, PaymentMethod, InvoiceStatus } from '@isp-erp/database';

@Injectable()
export class CollectionsService {
  constructor(private prisma: PrismaService) {}

  async findAllPayments(filter: PaymentFilterDto) {
    const { page = 1, limit = 20, search, status, collectorId, method } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (status) where.collectionStatus = status;
    if (collectorId) where.collectorId = collectorId;
    if (method) where.method = method;

    if (search) {
      where.OR = [
        { receiptNumber: { contains: search } },
        {
          customer: {
            OR: [
              { name: { contains: search } },
              { customerId: { contains: search } },
              { phone: { contains: search } },
              { pppoeUsername: { contains: search } },
            ],
          },
        },
      ];
    }

    const [payments, total] = await Promise.all([
      this.prisma.payment.findMany({
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
          collector: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          invoice: {
            select: {
              id: true,
              invoiceNumber: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data: payments,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({
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
          },
        },
        collector: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            billingMonth: true,
            total: true,
            dueAmount: true,
          },
        },
      },
    });

    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }

    return payment;
  }

  async createPayment(dto: CreatePaymentDto, currentUserId?: string) {
    const { customerId, invoiceId, amount, method, remarks, proofUrl } = dto;

    // Verify customer exists
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    // Resolve Collector
    let collectorId: string | null = null;
    if (currentUserId) {
      const user = await this.prisma.user.findUnique({
        where: { id: currentUserId },
        include: { role: true },
      });
      if (user) {
        if (user.role.name === 'COLLECTOR') {
          collectorId = user.id;
        } else {
          // If admin/finance logs it, attribute to client's assigned collector if set
          collectorId = customer.collectorId || user.id;
        }
      }
    }

    const today = new Date();
    const startOfToday = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    // Run transaction
    const payment = await this.prisma.$transaction(async (tx) => {
      // 1. Get next receipt sequence
      const counter = await tx.sequenceCounter.update({
        where: { name: 'receipt_number' },
        data: { current: { increment: 1 } },
      });
      const receiptNumber = generateId('REC', counter.current);

      let invoiceDueReductions = 0;
      let advanceBalanceIncrements = 0;
      const invoiceUpdates: Array<{ id: string; paidAmount: number; dueAmount: number; status: InvoiceStatus }> = [];

      // 2. Distribute amount
      if (invoiceId) {
        // Direct Invoice Payment
        const invoice = await tx.invoice.findUnique({
          where: { id: invoiceId },
        });

        if (!invoice) throw new NotFoundException('Invoice not found');
        if (invoice.status === InvoiceStatus.CANCELLED) throw new BadRequestException('Invoice is cancelled');
        if (invoice.status === InvoiceStatus.PAID) throw new BadRequestException('Invoice is already paid');

        if (amount >= invoice.dueAmount) {
          invoiceDueReductions = invoice.dueAmount;
          advanceBalanceIncrements = amount - invoice.dueAmount;
          invoiceUpdates.push({
            id: invoice.id,
            paidAmount: invoice.total,
            dueAmount: 0,
            status: InvoiceStatus.PAID,
          });
        } else {
          invoiceDueReductions = amount;
          invoiceUpdates.push({
            id: invoice.id,
            paidAmount: invoice.paidAmount + amount,
            dueAmount: invoice.dueAmount - amount,
            status: InvoiceStatus.PARTIALLY_PAID,
          });
        }
      } else {
        // FIFO Account Payment
        const unpaidInvoices = await tx.invoice.findMany({
          where: {
            customerId,
            status: { in: [InvoiceStatus.UNPAID, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.OVERDUE] },
          },
          orderBy: { createdAt: 'asc' },
        });

        let remaining = amount;
        for (const invoice of unpaidInvoices) {
          if (remaining <= 0) break;

          if (remaining >= invoice.dueAmount) {
            remaining -= invoice.dueAmount;
            invoiceDueReductions += invoice.dueAmount;
            invoiceUpdates.push({
              id: invoice.id,
              paidAmount: invoice.total,
              dueAmount: 0,
              status: InvoiceStatus.PAID,
            });
          } else {
            invoiceDueReductions += remaining;
            invoiceUpdates.push({
              id: invoice.id,
              paidAmount: invoice.paidAmount + remaining,
              dueAmount: invoice.dueAmount - remaining,
              status: InvoiceStatus.PARTIALLY_PAID,
            });
            remaining = 0;
          }
        }

        if (remaining > 0) {
          advanceBalanceIncrements = remaining;
        }
      }

      // Apply Invoice updates
      for (const update of invoiceUpdates) {
        await tx.invoice.update({
          where: { id: update.id },
          data: {
            paidAmount: update.paidAmount,
            dueAmount: update.dueAmount,
            status: update.status,
          },
        });
      }

      // Update Customer balances
      await tx.customer.update({
        where: { id: customerId },
        data: {
          totalDue: { decrement: invoiceDueReductions },
          advanceBalance: { increment: advanceBalanceIncrements },
        },
      });

      // 3. Create the payment record
      const createdPayment = await tx.payment.create({
        data: {
          receiptNumber,
          customerId,
          invoiceId: invoiceId || (invoiceUpdates.length > 0 ? invoiceUpdates[0].id : null),
          amount,
          method,
          collectorId,
          remarks,
          proofUrl,
          collectionStatus: CollectionStatus.PENDING,
        },
        include: {
          customer: { select: { name: true, customerId: true } },
          invoice: { select: { invoiceNumber: true } },
        },
      });

      // 4. Update collector daily cashbook if CASH payment
      if (method === PaymentMethod.CASH && collectorId) {
        const cashbook = await tx.collectorCashbook.findUnique({
          where: {
            collectorId_date: {
              collectorId,
              date: startOfToday,
            },
          },
        });

        if (cashbook) {
          await tx.collectorCashbook.update({
            where: { id: cashbook.id },
            data: {
              totalCollected: { increment: amount },
              pendingCash: { increment: amount },
            },
          });
        } else {
          await tx.collectorCashbook.create({
            data: {
              collectorId,
              date: startOfToday,
              totalCollected: amount,
              pendingCash: amount,
              status: CollectionStatus.PENDING,
            },
          });
        }
      }

      return createdPayment;
    });

    return payment;
  }

  async reconcilePayment(id: string, dto: ReconcileCollectionDto, adminUserId: string) {
    const { status, remarks } = dto;
    const payment = await this.findPayment(id);

    if (payment.collectionStatus === status) {
      return payment;
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // Reconcile Payment status
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          collectionStatus: status,
          remarks: remarks ? `${payment.remarks || ''}\n[Reconcile Remarks]: ${remarks}` : payment.remarks,
        },
      });

      // Rollback logic for REJECTED payment
      if (status === CollectionStatus.REJECTED && payment.collectionStatus !== CollectionStatus.REJECTED) {
        // 1. Reverse Invoice state
        if (payment.invoiceId) {
          const invoice = await tx.invoice.findUnique({ where: { id: payment.invoiceId } });
          if (invoice) {
            const refundedAmount = payment.amount;
            let newPaid = Math.max(0, invoice.paidAmount - refundedAmount);
            let newDue = invoice.dueAmount + refundedAmount;
            let newStatus: InvoiceStatus = newPaid === 0 ? InvoiceStatus.UNPAID : InvoiceStatus.PARTIALLY_PAID;

            // If it was overdue check dates
            if (newStatus === InvoiceStatus.UNPAID && new Date() > new Date(invoice.dueDate)) {
              newStatus = InvoiceStatus.OVERDUE;
            }

            await tx.invoice.update({
              where: { id: invoice.id },
              data: {
                paidAmount: newPaid,
                dueAmount: newDue,
                status: newStatus,
              },
            });
          }
        }

        // 2. Reverse Customer Due
        await tx.customer.update({
          where: { id: payment.customerId },
          data: {
            totalDue: { increment: payment.amount },
          },
        });

        // 3. Reverse Collector Cashbook
        if (payment.method === PaymentMethod.CASH && payment.collectorId) {
          const paymentDate = new Date(payment.createdAt);
          const startOfPaymentDay = new Date(Date.UTC(paymentDate.getUTCFullYear(), paymentDate.getUTCMonth(), paymentDate.getUTCDate()));

          const cashbook = await tx.collectorCashbook.findUnique({
            where: {
              collectorId_date: {
                collectorId: payment.collectorId,
                date: startOfPaymentDay,
              },
            },
          });

          if (cashbook) {
            await tx.collectorCashbook.update({
              where: { id: cashbook.id },
              data: {
                totalCollected: { decrement: payment.amount },
                pendingCash: { decrement: Math.min(payment.amount, cashbook.pendingCash) },
              },
            });
          }
        }
      }

      return updatedPayment;
    });

    return updated;
  }

  async findCashbooks(filter: CashbookFilterDto) {
    const { collectorId, status, date } = filter;
    const where: Prisma.CollectorCashbookWhereInput = {};

    if (collectorId) where.collectorId = collectorId;
    if (status) where.status = status;
    
    if (date) {
      const [year, month, day] = date.split('-').map(Number);
      where.date = new Date(Date.UTC(year, month - 1, day));
    }

    return this.prisma.collectorCashbook.findMany({
      where,
      include: {
        collector: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async submitCashbook(collectorId: string, dateStr: string, dto: SubmitCashbookDto) {
    const { submittedAmount, remarks } = dto;
    const [year, month, day] = dateStr.split('-').map(Number);
    const targetDate = new Date(Date.UTC(year, month - 1, day));

    const cashbook = await this.prisma.collectorCashbook.findUnique({
      where: {
        collectorId_date: {
          collectorId,
          date: targetDate,
        },
      },
    });

    if (!cashbook) {
      throw new NotFoundException(`No cashbook found for collector on ${dateStr}`);
    }

    return this.prisma.collectorCashbook.update({
      where: { id: cashbook.id },
      data: {
        submittedAmount,
        remarks,
        status: CollectionStatus.SUBMITTED,
      },
    });
  }

  async reconcileCashbook(id: string, dto: ReconcileCashbookDto, adminUserId: string) {
    const { status, actualAmount, remarks } = dto;

    const cashbook = await this.prisma.collectorCashbook.findUnique({
      where: { id },
    });

    if (!cashbook) {
      throw new NotFoundException('Cashbook record not found');
    }

    const shortage = Math.max(0, cashbook.totalCollected - actualAmount);
    const excess = Math.max(0, actualAmount - cashbook.totalCollected);

    return this.prisma.collectorCashbook.update({
      where: { id },
      data: {
        status,
        submittedAmount: actualAmount, // Adjust final verified cash submitted
        pendingCash: 0, // Cleared
        shortage,
        excess,
        remarks: remarks ? `${cashbook.remarks || ''}\n[Reconcile]: ${remarks}` : cashbook.remarks,
        approvedBy: adminUserId,
        approvedAt: new Date(),
      },
    });
  }

  async getStats() {
    const payments = await this.prisma.payment.findMany({
      select: { amount: true, collectionStatus: true, method: true },
    });

    const totalCollected = payments
      .filter((p) => p.collectionStatus === CollectionStatus.APPROVED)
      .reduce((sum, p) => sum + p.amount, 0);

    const pendingCollected = payments
      .filter((p) => p.collectionStatus === CollectionStatus.PENDING)
      .reduce((sum, p) => sum + p.amount, 0);

    const methodTotals = payments.reduce((acc, curr) => {
      if (curr.collectionStatus === CollectionStatus.APPROVED) {
        acc[curr.method] = (acc[curr.method] || 0) + curr.amount;
      }
      return acc;
    }, {} as Record<string, number>);

    const cashbooks = await this.prisma.collectorCashbook.findMany({
      select: { totalCollected: true, shortage: true, status: true },
    });

    const pendingCashbooks = cashbooks.filter((c) => c.status === CollectionStatus.SUBMITTED).length;
    const totalShortages = cashbooks.reduce((sum, c) => sum + c.shortage, 0);

    return {
      financials: {
        totalCollected,
        pendingCollected,
        totalShortages,
      },
      counts: {
        total: payments.length,
        approved: payments.filter((p) => p.collectionStatus === CollectionStatus.APPROVED).length,
        pending: payments.filter((p) => p.collectionStatus === CollectionStatus.PENDING).length,
        rejected: payments.filter((p) => p.collectionStatus === CollectionStatus.REJECTED).length,
        pendingCashbooks,
      },
      methods: methodTotals,
    };
  }
}
