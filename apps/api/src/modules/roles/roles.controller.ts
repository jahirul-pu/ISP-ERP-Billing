import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { RolesService } from './roles.service';
import { Roles } from '../../common/decorators';

@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) {}

  @Get()
  @ApiOperation({ summary: 'List all roles' })
  async findAll() {
    return { success: true, data: await this.rolesService.findAll() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get role by ID' })
  async findOne(@Param('id') id: string) {
    return { success: true, data: await this.rolesService.findOne(id) };
  }

  @Patch(':id')
  @Roles('SUPER_ADMIN')
  @ApiOperation({ summary: 'Update role permissions' })
  async update(@Param('id') id: string, @Body() body: { permissions?: object; displayName?: string; description?: string }) {
    return { success: true, data: await this.rolesService.update(id, body) };
  }
}
