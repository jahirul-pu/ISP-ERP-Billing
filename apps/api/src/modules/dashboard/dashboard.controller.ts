import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('executive')
  @ApiOperation({ summary: 'Get executive KPI metrics for the dashboard overview' })
  async getExecutiveKpis() {
    const data = await this.service.getExecutiveKpis();
    return { success: true, data };
  }

  @Get('trends')
  @ApiOperation({ summary: 'Get monthly revenue, collections, and expense trends' })
  async getTrends(@Query('months') months?: number) {
    const data = await this.service.getTrends(months || 12);
    return { success: true, data };
  }

  @Get('customer-status')
  @ApiOperation({ summary: 'Get customer status distribution for charts' })
  async getCustomerStatusDistribution() {
    const data = await this.service.getCustomerStatusDistribution();
    return { success: true, data };
  }

  @Get('area-stats')
  @ApiOperation({ summary: 'Get per-area performance statistics' })
  async getAreaStats() {
    const data = await this.service.getAreaStats();
    return { success: true, data };
  }

  @Get('recent-activity')
  @ApiOperation({ summary: 'Get recent activity feed across all modules' })
  async getRecentActivity(@Query('limit') limit?: number) {
    const data = await this.service.getRecentActivity(limit || 15);
    return { success: true, data };
  }

  @Get('due-customers')
  @ApiOperation({ summary: 'Get top customers with outstanding dues' })
  async getDueCustomers(@Query('limit') limit?: number) {
    const data = await this.service.getDueCustomers(limit || 10);
    return { success: true, data };
  }

  @Get('package-distribution')
  @ApiOperation({ summary: 'Get customer distribution across packages for pie chart' })
  async getPackageDistribution() {
    const data = await this.service.getPackageDistribution();
    return { success: true, data };
  }
}
