import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AreasService } from './areas.service';

@ApiTags('Areas')
@ApiBearerAuth()
@Controller()
export class AreasController {
  constructor(private readonly areasService: AreasService) {}

  // ─── Areas ──────────────────────────────────
  @Get('areas')
  @ApiOperation({ summary: 'List all areas with zones and POPs' })
  async findAllAreas() {
    return { success: true, data: await this.areasService.findAllAreas() };
  }

  @Post('areas')
  @ApiOperation({ summary: 'Create area' })
  async createArea(@Body() body: { name: string; code?: string }) {
    return { success: true, data: await this.areasService.createArea(body) };
  }

  @Patch('areas/:id')
  @ApiOperation({ summary: 'Update area' })
  async updateArea(@Param('id') id: string, @Body() body: { name?: string; code?: string }) {
    return { success: true, data: await this.areasService.updateArea(id, body) };
  }

  @Delete('areas/:id')
  @ApiOperation({ summary: 'Delete area' })
  async deleteArea(@Param('id') id: string) {
    await this.areasService.deleteArea(id);
    return { success: true, message: 'Area deleted' };
  }

  // ─── Zones ──────────────────────────────────
  @Get('zones')
  @ApiOperation({ summary: 'List zones' })
  async findAllZones(@Query('areaId') areaId?: string) {
    return { success: true, data: await this.areasService.findAllZones(areaId) };
  }

  @Post('zones')
  @ApiOperation({ summary: 'Create zone' })
  async createZone(@Body() body: { name: string; code?: string; areaId: string }) {
    return { success: true, data: await this.areasService.createZone(body) };
  }

  @Patch('zones/:id')
  @ApiOperation({ summary: 'Update zone' })
  async updateZone(@Param('id') id: string, @Body() body: { name?: string; code?: string }) {
    return { success: true, data: await this.areasService.updateZone(id, body) };
  }

  @Delete('zones/:id')
  @ApiOperation({ summary: 'Delete zone' })
  async deleteZone(@Param('id') id: string) {
    await this.areasService.deleteZone(id);
    return { success: true, message: 'Zone deleted' };
  }

  // ─── POPs ───────────────────────────────────
  @Get('pops')
  @ApiOperation({ summary: 'List POPs' })
  async findAllPops(@Query('zoneId') zoneId?: string) {
    return { success: true, data: await this.areasService.findAllPops(zoneId) };
  }

  @Post('pops')
  @ApiOperation({ summary: 'Create POP' })
  async createPop(@Body() body: { name: string; code?: string; address?: string; gpsLat?: number; gpsLng?: number; zoneId: string }) {
    return { success: true, data: await this.areasService.createPop(body) };
  }

  @Patch('pops/:id')
  @ApiOperation({ summary: 'Update POP' })
  async updatePop(@Param('id') id: string, @Body() body: { name?: string; code?: string; address?: string }) {
    return { success: true, data: await this.areasService.updatePop(id, body) };
  }

  @Delete('pops/:id')
  @ApiOperation({ summary: 'Delete POP' })
  async deletePop(@Param('id') id: string) {
    await this.areasService.deletePop(id);
    return { success: true, message: 'POP deleted' };
  }
}
