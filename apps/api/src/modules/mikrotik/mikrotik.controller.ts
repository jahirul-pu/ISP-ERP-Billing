import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { MikrotikService } from './mikrotik.service';
import { CreateRouterDto } from './dto/create-router.dto';
import { UpdateRouterDto } from './dto/update-router.dto';

@ApiTags('MikroTik')
@ApiBearerAuth()
@Controller('mikrotik')
export class MikrotikController {
  constructor(private readonly service: MikrotikService) {}

  @Get('routers')
  @ApiOperation({ summary: 'List all configured MikroTik routers' })
  async findAll() {
    return { success: true, data: await this.service.findAll() };
  }

  @Get('routers/:id')
  @ApiOperation({ summary: 'Get details of a specific router' })
  async findOne(@Param('id') id: string) {
    return { success: true, data: await this.service.findOne(id) };
  }

  @Post('routers')
  @ApiOperation({ summary: 'Add a new MikroTik router config' })
  async create(@Body() dto: CreateRouterDto) {
    return { success: true, data: await this.service.create(dto) };
  }

  @Patch('routers/:id')
  @ApiOperation({ summary: 'Update MikroTik router configuration' })
  async update(@Param('id') id: string, @Body() dto: UpdateRouterDto) {
    return { success: true, data: await this.service.update(id, dto) };
  }

  @Delete('routers/:id')
  @ApiOperation({ summary: 'Delete a MikroTik router config' })
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { success: true, message: 'Router deleted successfully' };
  }

  @Post('routers/:id/test')
  @ApiOperation({ summary: 'Test TCP connection to the MikroTik RouterOS API' })
  async testConnection(@Param('id') id: string) {
    const res = await this.service.testConnection(id);
    return { success: res.success, message: res.message };
  }

  @Post('routers/:id/sync')
  @ApiOperation({ summary: 'Manually trigger a PPPoE secret & status sync for a router' })
  async syncRouter(@Param('id') id: string) {
    const res = await this.service.syncRouter(id);
    return { success: res.success, data: res.stats };
  }

  @Get('sync-logs')
  @ApiOperation({ summary: 'List recent router sync execution logs' })
  async getSyncLogs() {
    return { success: true, data: await this.service.getSyncLogs() };
  }

  @Get('routers/:id/online-users')
  @ApiOperation({ summary: 'List active online PPPoE sessions from the router' })
  async getOnlineUsers(@Param('id') id: string) {
    return { success: true, data: await this.service.getOnlineUsers(id) };
  }
}
