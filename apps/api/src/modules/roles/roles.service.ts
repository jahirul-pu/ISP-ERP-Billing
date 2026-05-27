import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RolesService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { users: true } } },
    });
  }

  async findOne(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: { _count: { select: { users: true } } },
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async update(id: string, data: { permissions?: object; displayName?: string; description?: string }) {
    const role = await this.findOne(id);
    if (role.isSystem && data.permissions) {
      // Allow editing permissions for system roles but not name
    }
    return this.prisma.role.update({ where: { id }, data });
  }
}
