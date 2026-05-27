import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class PackagesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.package.findMany({
      include: { _count: { select: { customers: true } } },
      orderBy: { price: 'asc' },
    });
  }

  async findOne(id: string) {
    const pkg = await this.prisma.package.findUnique({
      where: { id },
      include: { _count: { select: { customers: true } } },
    });
    if (!pkg) throw new NotFoundException('Package not found');
    return pkg;
  }

  async create(data: { name: string; bandwidth: string; price: number; mikrotikProfile?: string; description?: string }) {
    return this.prisma.package.create({ data });
  }

  async update(id: string, data: { name?: string; bandwidth?: string; price?: number; mikrotikProfile?: string; description?: string; isActive?: boolean }) {
    await this.findOne(id);
    return this.prisma.package.update({ where: { id }, data });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.package.update({
      where: { id },
      data: { isActive: false },
    });
  }
}
