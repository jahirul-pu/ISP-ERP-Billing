import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';
import { MikrotikClient } from '@isp-erp/mikrotik-client';
import * as crypto from 'crypto';
import { generateId } from '@isp-erp/shared';

@Injectable()
export class MikrotikService {
  private readonly logger = new Logger(MikrotikService.name);
  private readonly algorithm = 'aes-256-cbc';
  private readonly key: Buffer;

  constructor(private prisma: PrismaService) {
    const secret = process.env.JWT_SECRET || 'dev-secret-key-32-chars-long-at-least-12345';
    this.key = crypto.scryptSync(secret, 'salt', 32);
  }

  private encrypt(text: string): string {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
  }

  private decrypt(text: string): string {
    const [ivHex, encryptedHex] = text.split(':');
    if (!ivHex || !encryptedHex) throw new Error('Invalid encrypted password format');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  }

  async findAll() {
    const routers = await this.prisma.mikrotikRouter.findMany({
      include: {
        pop: { select: { name: true } },
        _count: { select: { customers: true, syncLogs: true } },
      },
      orderBy: { name: 'asc' },
    });

    const activeCounts = await this.prisma.customer.groupBy({
      by: ['routerId'],
      where: {
        isOnline: true,
        routerId: { in: routers.map(r => r.id) }
      },
      _count: {
        _all: true
      }
    });

    const activeMap = new Map(
      activeCounts
        .filter(ac => ac.routerId)
        .map(ac => [ac.routerId!, ac._count._all])
    );

    return routers.map(r => ({
      ...r,
      totalSecrets: r._count.customers,
      activeSessions: activeMap.get(r.id) || 0,
    }));
  }

  async findOne(id: string) {
    const router = await this.prisma.mikrotikRouter.findUnique({
      where: { id },
      include: {
        pop: { select: { name: true } },
        _count: { select: { customers: true } },
      },
    });
    if (!router) throw new NotFoundException('Router not found');

    const activeSessions = await this.prisma.customer.count({
      where: {
        routerId: id,
        isOnline: true,
      }
    });

    return {
      ...router,
      totalSecrets: router._count.customers,
      activeSessions,
    };
  }

  async create(dto: CreateRouterDto) {
    const existing = await this.prisma.mikrotikRouter.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Router name already exists');

    const passwordEnc = dto.password ? this.encrypt(dto.password) : '';

    const { password, ...routerData } = dto;

    return this.prisma.mikrotikRouter.create({
      data: {
        ...routerData,
        passwordEnc,
      } as any,
    });
  }

  async update(id: string, dto: UpdateRouterDto) {
    const router = await this.findOne(id);

    const updateData: any = { ...dto };
    delete updateData.password;

    if (dto.password) {
      updateData.passwordEnc = this.encrypt(dto.password);
    }

    return this.prisma.mikrotikRouter.update({
      where: { id },
      data: updateData as any,
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.mikrotikRouter.delete({ where: { id } });
  }

  async getClient(id: string): Promise<MikrotikClient> {
    const router = await this.findOne(id);
    const password = this.decrypt(router.passwordEnc);
    return new MikrotikClient({
      host: router.host,
      port: router.port,
      user: router.username,
      password,
    });
  }

  async testConnection(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const client = await this.getClient(id);
      const active = await client.ping();
      if (active) {
        return { success: true, message: 'Connected successfully to MikroTik router!' };
      }
      return { success: false, message: 'Could not connect: authentication or timeout error.' };
    } catch (err: any) {
      return { success: false, message: `Connection failed: ${err.message}` };
    }
  }

  async syncRouter(id: string): Promise<{ success: boolean; stats: any }> {
    const startedAt = new Date();
    const router = await this.findOne(id);

    // Create initial Sync Log
    const syncLog = await this.prisma.syncLog.create({
      data: {
        routerId: id,
        status: 'IN_PROGRESS',
        startedAt,
      } as any,
    });

    let client: MikrotikClient | null = null;
    try {
      client = await this.getClient(id);
      await client.connect();

      // Fetch sequentially to prevent mikro-routeros concurrency bugs
      const secretsRaw = await client.getPPPoESecrets();
      const activeList = await client.getActiveConnections();
      const profiles = await client.getProfiles();
      
      // Filter out invalid secrets without a name
      const secrets = secretsRaw.filter(s => s && s.name);

      // Get default geography nodes for imports
      const defaultPop = await this.prisma.pop.findFirst({
        include: { zone: { include: { area: true } } },
      });

      let areaId = defaultPop?.zone?.areaId;
      let zoneId = defaultPop?.zoneId;
      let popId = defaultPop?.id;

      if (!popId) {
        const area = await this.prisma.area.findFirst() || await this.prisma.area.create({ data: { name: 'Default Area', code: 'DEF' } });
        const zone = await this.prisma.zone.findFirst({ where: { areaId: area.id } }) || await this.prisma.zone.create({ data: { name: 'Default Zone', code: 'DEF-Z', areaId: area.id } });
        const pop = await this.prisma.pop.findFirst({ where: { zoneId: zone.id } }) || await this.prisma.pop.create({ data: { name: 'Default POP', code: 'DEF-P', zoneId: zone.id } });
        areaId = area.id;
        zoneId = zone.id;
        popId = pop.id;
      }

      const packagesList = await this.prisma.package.findMany();
      const packageMap = new Map(packagesList.map(p => [p.mikrotikProfile || p.name, p.id]));

      const totalUsers = secrets.length;
      let synced = 0;
      let failed = 0;
      let duplicates = 0;
      const details: any = { secrets: [], activeCount: activeList.length, profilesCount: profiles.length };

      // Cache online status by username
      const activeUsernames = new Set(activeList.map(a => a.name));

      // Reset all customers on this router to offline first
      await this.prisma.customer.updateMany({
        where: { routerId: id },
        data: { isOnline: false },
      });

      // Synchronize each secret to Database Customers
      for (const secret of secrets) {
        try {
          const customer = await this.prisma.customer.findUnique({
            where: { pppoeUsername: secret.name },
          });

          const isOnline = activeUsernames.has(secret.name);

          if (customer) {
            await this.prisma.customer.update({
              where: { id: customer.id },
              data: {
                isOnline,
                lastSeen: isOnline ? new Date() : customer.lastSeen,
                routerId: id,
                bandwidthProfile: secret.profile,
              },
            });
            synced++;
          } else {
            // Auto-create/import the customer!
            let customerId = '';
            try {
              const counter = await this.prisma.sequenceCounter.update({
                where: { name: 'customer_id' },
                data: { current: { increment: 1 } },
              });
              customerId = generateId('ISP', counter.current);
            } catch {
              customerId = `ISP-${Math.floor(Math.random() * 90000) + 10000}`;
            }

            const mappedPackageId = secret.profile ? packageMap.get(secret.profile) : null;

            await this.prisma.customer.create({
              data: {
                customerId,
                name: secret.name, // Use PPPoE name as customer name
                phone: '01700000000', // placeholder phone
                pppoeUsername: secret.name,
                status: 'ACTIVE',
                type: 'HOME',
                routerId: id,
                bandwidthProfile: secret.profile,
                isOnline,
                lastSeen: isOnline ? new Date() : null,
                areaId,
                zoneId,
                popId,
                packageId: mappedPackageId || undefined
              } as any
            });
            synced++;
            details.secrets.push({ name: secret.name, status: 'IMPORTED' });
          }
        } catch (err: any) {
          failed++;
          this.logger.error(`Failed to sync user ${secret.name}: ${err.message}`);
        }
      }

      const completedAt = new Date();
      const stats = { totalUsers, synced, failed, duplicates };

      // Update SyncLog with Success
      await this.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'SUCCESS',
          totalUsers,
          synced,
          failed,
          details: details as any,
          completedAt,
        } as any,
      });

      // Update router last sync time
      await this.prisma.mikrotikRouter.update({
        where: { id },
        data: { lastSyncAt: completedAt },
      });

      return { success: true, stats };
    } catch (err: any) {
      this.logger.error(`Router sync failed for ${router.name}: ${err.message}`);
      await this.prisma.syncLog.update({
        where: { id: syncLog.id },
        data: {
          status: 'FAILED',
          errorMessage: err.message,
          completedAt: new Date(),
        } as any,
      });
      return { success: false, stats: { error: err.message } };
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  async getSyncLogs(routerId?: string) {
    return this.prisma.syncLog.findMany({
      where: routerId ? { routerId } : undefined,
      include: {
        router: { select: { name: true } },
      },
      orderBy: { startedAt: 'desc' },
      take: 50,
    });
  }

  async getOnlineUsers(id: string) {
    let client: MikrotikClient | null = null;
    try {
      client = await this.getClient(id);
      await client.connect();
      return await client.getActiveConnections();
    } finally {
      if (client) {
        await client.close();
      }
    }
  }

  async getSecrets(id: string) {
    await this.findOne(id); // Throws 404 if router not found
    return this.prisma.customer.findMany({
      where: { routerId: id },
      select: {
        id: true,
        customerId: true,
        name: true,
        phone: true,
        pppoeUsername: true,
        bandwidthProfile: true,
        isOnline: true,
        lastSeen: true,
        package: {
          select: {
            name: true,
            price: true,
          }
        }
      },
      orderBy: { name: 'asc' },
    });
  }

  async disconnectUser(id: string, username: string): Promise<boolean> {
    let client: MikrotikClient | null = null;
    try {
      client = await this.getClient(id);
      await client.connect();
      const res = await client.disconnectUser(username);
      await this.prisma.customer.updateMany({
        where: { routerId: id, pppoeUsername: username },
        data: { isOnline: false }
      });
      return res;
    } finally {
      if (client) {
        await client.close();
      }
    }
  }
}
