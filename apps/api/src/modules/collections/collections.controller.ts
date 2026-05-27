import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CollectionsService } from './collections.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentFilterDto } from './dto/payment-filter.dto';
import { CashbookFilterDto } from './dto/cashbook-filter.dto';
import { ReconcileCollectionDto } from './dto/reconcile-collection.dto';
import { SubmitCashbookDto } from './dto/submit-cashbook.dto';
import { ReconcileCashbookDto } from './dto/reconcile-cashbook.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Collections')
@ApiBearerAuth()
@Controller('collections')
export class CollectionsController {
  constructor(private readonly service: CollectionsService) {}

  @Get('payments')
  @ApiOperation({ summary: 'Get a paginated list of logged customer payments' })
  async findAllPayments(@Query() filter: PaymentFilterDto) {
    const result = await this.service.findAllPayments(filter);
    return { success: true, ...result };
  }

  @Get('payments/stats')
  @ApiOperation({ summary: 'Get financial stats for payment collections' })
  async getStats() {
    const data = await this.service.getStats();
    return { success: true, data };
  }

  @Get('payments/:id')
  @ApiOperation({ summary: 'Get detailed payment receipt record' })
  async findPayment(@Param('id') id: string) {
    const data = await this.service.findPayment(id);
    return { success: true, data };
  }

  @Post('payments')
  @ApiOperation({ summary: 'Log a new payment collection' })
  async createPayment(@Body() dto: CreatePaymentDto, @CurrentUser('id') userId: string) {
    const data = await this.service.createPayment(dto, userId);
    return { success: true, data };
  }

  @Patch('payments/:id/reconcile')
  @ApiOperation({ summary: 'Reconcile/Approve/Reject an individual payment collection' })
  async reconcilePayment(
    @Param('id') id: string,
    @Body() dto: ReconcileCollectionDto,
    @CurrentUser('id') adminUserId: string
  ) {
    const data = await this.service.reconcilePayment(id, dto, adminUserId);
    return { success: true, data };
  }

  @Get('cashbooks')
  @ApiOperation({ summary: 'Get daily cashbooks for billing collectors' })
  async findCashbooks(@Query() filter: CashbookFilterDto) {
    const data = await this.service.findCashbooks(filter);
    return { success: true, data };
  }

  @Post('cashbooks/submit')
  @ApiOperation({ summary: 'Collector submits daily cash collections for reconciliation' })
  async submitCashbook(
    @Query('date') dateStr: string,
    @Body() dto: SubmitCashbookDto,
    @CurrentUser('id') collectorId: string
  ) {
    const data = await this.service.submitCashbook(collectorId, dateStr, dto);
    return { success: true, data };
  }

  @Patch('cashbooks/:id/reconcile')
  @ApiOperation({ summary: 'Admin reconciles and closes a daily collector cashbook' })
  async reconcileCashbook(
    @Param('id') id: string,
    @Body() dto: ReconcileCashbookDto,
    @CurrentUser('id') adminUserId: string
  ) {
    const data = await this.service.reconcileCashbook(id, dto, adminUserId);
    return { success: true, data };
  }
}
