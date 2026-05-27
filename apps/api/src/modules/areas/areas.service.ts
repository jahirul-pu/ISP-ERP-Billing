import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AreasService {
  constructor(private prisma: PrismaService) {}

  // ─── Areas ──────────────────────────────────
  async findAllAreas() {
    return this.prisma.area.findMany({
      include: {
        zones: {
          include: {
            pops: true,
            _count: { select: { customers: true } },
          },
        },
        _count: { select: { customers: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createArea(data: { name: string; code?: string }) {
    return this.prisma.area.create({ data });
  }

  async updateArea(id: string, data: { name?: string; code?: string }) {
    return this.prisma.area.update({ where: { id }, data });
  }

  async deleteArea(id: string) {
    const area = await this.prisma.area.findUnique({
      where: { id },
      include: { _count: { select: { customers: true } } },
    });
    if (!area) throw new NotFoundException('Area not found');
    if (area._count.customers > 0) {
      throw new Error('Cannot delete area with existing customers');
    }
    return this.prisma.area.delete({ where: { id } });
  }

  // ─── Zones ──────────────────────────────────
  async findAllZones(areaId?: string) {
    return this.prisma.zone.findMany({
      where: areaId ? { areaId } : undefined,
      include: {
        area: { select: { name: true } },
        pops: true,
        _count: { select: { customers: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createZone(data: { name: string; code?: string; areaId: string }) {
    return this.prisma.zone.create({
      data,
      include: { area: { select: { name: true } } },
    });
  }

  async updateZone(id: string, data: { name?: string; code?: string }) {
    return this.prisma.zone.update({ where: { id }, data });
  }

  async deleteZone(id: string) {
    return this.prisma.zone.delete({ where: { id } });
  }

  // ─── POPs ───────────────────────────────────
  async findAllPops(zoneId?: string) {
    return this.prisma.pop.findMany({
      where: zoneId ? { zoneId } : undefined,
      include: {
        zone: { select: { name: true, area: { select: { name: true } } } },
        _count: { select: { customers: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createPop(data: { name: string; code?: string; address?: string; gpsLat?: number; gpsLng?: number; zoneId: string }) {
    return this.prisma.pop.create({
      data,
      include: { zone: { select: { name: true } } },
    });
  }

  async updatePop(id: string, data: { name?: string; code?: string; address?: string }) {
    return this.prisma.pop.update({ where: { id }, data });
  }

  async deletePop(id: string) {
    return this.prisma.pop.delete({ where: { id } });
  }
}
