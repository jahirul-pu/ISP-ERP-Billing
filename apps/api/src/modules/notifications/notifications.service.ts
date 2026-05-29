import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { BulkCampaignDto } from './dto/bulk-campaign.dto';
import { createPaginationMeta } from '@isp-erp/shared';
import { Prisma } from '@isp-erp/database';

@Injectable()
export class NotificationsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateNotificationDto, createdById?: string) {
    let recipientAddress = dto.recipient;

    // 1. Resolve recipient address from customer record if recipient is not explicitly provided
    if (dto.recipientId && !recipientAddress) {
      const customer = await this.prisma.customer.findUnique({
        where: { id: dto.recipientId },
      });
      if (!customer) {
        throw new NotFoundException(`Customer with ID ${dto.recipientId} not found`);
      }
      recipientAddress = dto.channel === 'EMAIL' ? (customer.pppoeUsername ? `${customer.pppoeUsername}@isp-erp.local` : 'customer@isp-erp.local') : customer.phone;
    }

    // 2. Create PENDING notification log
    const notification = await this.prisma.notification.create({
      data: {
        type: dto.type ?? 'CUSTOM',
        channel: dto.channel,
        recipientId: dto.recipientId || null,
        recipient: recipientAddress || 'Unknown',
        subject: dto.subject || null,
        message: dto.message,
        status: 'PENDING',
        createdById: createdById || null,
      },
    });

    // 3. Fire asynchronous simulated dispatch (non-blocking)
    this.simulatedDispatch(notification.id);

    return notification;
  }

  async findAll(filter: NotificationFilterDto) {
    const { page = 1, limit = 20, search, channel, status, type } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.NotificationWhereInput = {};

    if (channel) where.channel = channel;
    if (status) where.status = status;
    if (type) where.type = type;

    if (search) {
      where.OR = [
        { recipient: { contains: search } },
        { message: { contains: search } },
        { subject: { contains: search } },
      ];
    }

    const [notifications, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.notification.count({ where }),
    ]);

    // Query details of linked customers for UI display
    const recipientIds = Array.from(new Set(notifications.map((n) => n.recipientId).filter(Boolean)));
    const customers = await this.prisma.customer.findMany({
      where: { id: { in: recipientIds as string[] } },
      select: { id: true, customerId: true, name: true },
    });
    const customerMap = new Map(customers.map((c) => [c.id, c]));

    const data = notifications.map((n) => ({
      ...n,
      customer: n.recipientId ? customerMap.get(n.recipientId) || null : null,
    }));

    return {
      data,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async triggerBulkCampaign(dto: BulkCampaignDto, createdById?: string) {
    // 1. Resolve targeted audience
    const customerWhere: any = {};

    if (dto.targetType === 'ALL') {
      customerWhere.status = 'ACTIVE';
    } else if (dto.targetType === 'AREA') {
      customerWhere.areaId = dto.targetValue;
      customerWhere.status = 'ACTIVE';
    } else if (dto.targetType === 'PACKAGE') {
      customerWhere.packageId = dto.targetValue;
      customerWhere.status = 'ACTIVE';
    } else if (dto.targetType === 'STATUS') {
      customerWhere.status = dto.targetValue;
    }

    const customers = await this.prisma.customer.findMany({
      where: customerWhere,
      select: { id: true, name: true, customerId: true, phone: true, pppoeUsername: true },
    });

    if (customers.length === 0) {
      return { success: true, count: 0, message: 'No customers match the target criteria' };
    }

    // 2. Batch-create notifications
    const createdNotifications = [];

    for (const customer of customers) {
      let recipientAddress = dto.channel === 'EMAIL' ? (customer.pppoeUsername ? `${customer.pppoeUsername}@isp-erp.local` : 'customer@isp-erp.local') : customer.phone;

      // Premium Touch: Replace placeholders like {{name}} and {{customerId}}
      let processedMessage = dto.message
        .replace(/{{name}}/g, customer.name)
        .replace(/{{customerId}}/g, customer.customerId);

      const notification = await this.prisma.notification.create({
        data: {
          type: 'CUSTOM',
          channel: dto.channel,
          recipientId: customer.id,
          recipient: recipientAddress || 'Unknown',
          subject: dto.subject || null,
          message: processedMessage,
          status: 'PENDING',
          createdById: createdById || null,
        },
      });

      createdNotifications.push(notification);

      // Async simulated dispatch
      this.simulatedDispatch(notification.id);
    }

    return {
      success: true,
      count: customers.length,
      message: `Successfully queued ${customers.length} notifications for dispatch.`,
    };
  }

  async getStats() {
    const [totalCount, smsCount, whatsappCount, emailCount, sentCount, failedCount] = await Promise.all([
      this.prisma.notification.count(),
      this.prisma.notification.count({ where: { channel: 'SMS' } }),
      this.prisma.notification.count({ where: { channel: 'WHATSAPP' } }),
      this.prisma.notification.count({ where: { channel: 'EMAIL' } }),
      this.prisma.notification.count({ where: { status: 'SENT' } }),
      this.prisma.notification.count({ where: { status: 'FAILED' } }),
    ]);

    const divisor = sentCount + failedCount;
    const successRate = divisor > 0 ? Math.round((sentCount / divisor) * 100) : 100;

    return {
      total: totalCount,
      sms: smsCount,
      whatsapp: whatsappCount,
      email: emailCount,
      successRate,
      failed: failedCount,
    };
  }

  // ─── Private Mock Gateway Dispatcher ──────────────────────────

  private async simulatedDispatch(notificationId: string) {
    // Run after 500ms to simulate network latency
    setTimeout(async () => {
      try {
        const notification = await this.prisma.notification.findUnique({
          where: { id: notificationId },
        });
        if (!notification) return;

        // 95% Success Rate
        const isSuccessful = Math.random() < 0.95;

        if (isSuccessful) {
          await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: 'SENT',
              sentAt: new Date(),
            },
          });
          console.log(`[Simulated Gateway] Successfully sent ${notification.channel} to ${notification.recipient}: "${notification.message.substring(0, 40)}..."`);
        } else {
          await this.prisma.notification.update({
            where: { id: notificationId },
            data: {
              status: 'FAILED',
              errorMessage: 'Carrier Gateway Timeout / Network Connection Failure',
            },
          });
          console.error(`[Simulated Gateway] Failed to send ${notification.channel} to ${notification.recipient}`);
        }
      } catch (err) {
        console.error('Error during simulated notification dispatch:', err);
      }
    }, 500);
  }
}
