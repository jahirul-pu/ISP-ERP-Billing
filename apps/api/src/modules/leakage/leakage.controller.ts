import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { LeakageService } from './leakage.service';

@ApiTags('Revenue Leakage')
@ApiBearerAuth()
@Controller('leakage')
export class LeakageController {
  constructor(private readonly service: LeakageService) {}

  @Get('report')
  @ApiOperation({ summary: 'Get full revenue leakage analysis report' })
  async getLeakageReport() {
    const data = await this.service.getLeakageReport();
    return { success: true, data };
  }

  @Get('unbilled-users')
  @ApiOperation({ summary: 'Get users active in MikroTik but not billed this month' })
  async getUnbilledUsers() {
    const data = await this.service.getUnbilledUsers();
    return { success: true, data, total: data.length };
  }

  @Get('inactive-billed')
  @ApiOperation({ summary: 'Get users billed but with no active MikroTik connection' })
  async getInactiveBilled() {
    const data = await this.service.getInactiveBilled();
    return { success: true, data, total: data.length };
  }

  @Get('duplicates')
  @ApiOperation({ summary: 'Get customers with duplicate invoices in the same period' })
  async getDuplicateBilling() {
    const data = await this.service.getDuplicateBilling();
    return { success: true, data, total: data.length };
  }

  @Get('unassigned')
  @ApiOperation({ summary: 'Get payments not linked to any invoice' })
  async getUnassignedCollections() {
    const data = await this.service.getUnassignedCollections();
    return { success: true, data, total: data.length };
  }
}
