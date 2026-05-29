import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { NotificationFilterDto } from './dto/notification-filter.dto';
import { BulkCampaignDto } from './dto/bulk-campaign.dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get paginated list of sent/pending notification logs' })
  async findAll(@Query() filter: NotificationFilterDto) {
    const result = await this.notificationsService.findAll(filter);
    return { success: true, ...result };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get summary statistics of notification channels and success rate' })
  async getStats() {
    const data = await this.notificationsService.getStats();
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Send an individual notification (SMS, email, or WhatsApp)' })
  async create(
    @Body() dto: CreateNotificationDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.notificationsService.create(dto, userId);
    return { success: true, data };
  }

  @Post('campaign')
  @ApiOperation({ summary: 'Launch a bulk notification alert campaign targeting specific client cohorts' })
  async triggerBulkCampaign(
    @Body() dto: BulkCampaignDto,
    @CurrentUser('id') userId: string,
  ) {
    const data = await this.notificationsService.triggerBulkCampaign(dto, userId);
    return data;
  }
}
