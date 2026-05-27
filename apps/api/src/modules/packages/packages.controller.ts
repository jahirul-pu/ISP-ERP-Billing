import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { PackagesService } from './packages.service';

@ApiTags('Packages')
@ApiBearerAuth()
@Controller('packages')
export class PackagesController {
  constructor(private readonly packagesService: PackagesService) {}

  @Get()
  @ApiOperation({ summary: 'List all packages' })
  async findAll() {
    return { success: true, data: await this.packagesService.findAll() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get package by ID' })
  async findOne(@Param('id') id: string) {
    return { success: true, data: await this.packagesService.findOne(id) };
  }

  @Post()
  @ApiOperation({ summary: 'Create package' })
  async create(@Body() body: { name: string; bandwidth: string; price: number; mikrotikProfile?: string; description?: string }) {
    return { success: true, data: await this.packagesService.create(body) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update package' })
  async update(@Param('id') id: string, @Body() body: { name?: string; bandwidth?: string; price?: number; mikrotikProfile?: string; description?: string; isActive?: boolean }) {
    return { success: true, data: await this.packagesService.update(id, body) };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Deactivate package' })
  async remove(@Param('id') id: string) {
    return { success: true, data: await this.packagesService.remove(id) };
  }
}
