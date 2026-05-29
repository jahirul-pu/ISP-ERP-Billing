import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuditLogsService } from './audit-logs.service';
import { AuditLogFilterDto } from './dto/audit-log-filter.dto';
import { Roles } from '../../common/decorators';

@ApiTags('Audit Logs')
@ApiBearerAuth()
@Controller('audit-logs')
@Roles('SUPER_ADMIN', 'ADMIN')
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of system audit logs' })
  async findAll(@Query() filter: AuditLogFilterDto) {
    const result = await this.auditLogsService.findAll(filter);
    return result;
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get audit logs KPI summary stats' })
  async getStats() {
    return await this.auditLogsService.getStats();
  }
}
