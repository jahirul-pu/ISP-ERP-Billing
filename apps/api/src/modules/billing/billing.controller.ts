import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CreateInvoiceDto } from './dto/create-invoice.dto';
import { UpdateInvoiceDto } from './dto/update-invoice.dto';
import { InvoiceFilterDto } from './dto/invoice-filter.dto';
import { GenerateBillsDto } from './dto/generate-bills.dto';

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly service: BillingService) {}

  @Get('invoices')
  @ApiOperation({ summary: 'Get a paginated list of all invoices with filters' })
  async findAll(@Query() filter: InvoiceFilterDto) {
    const result = await this.service.findAll(filter);
    return { success: true, ...result };
  }

  @Get('invoices/stats')
  @ApiOperation({ summary: 'Get total financial metrics and counts for invoices' })
  async getStats() {
    const data = await this.service.getStats();
    return { success: true, data };
  }

  @Get('invoices/:id')
  @ApiOperation({ summary: 'Get detailed invoice information' })
  async findOne(@Param('id') id: string) {
    const data = await this.service.findOne(id);
    return { success: true, data };
  }

  @Post('invoices')
  @ApiOperation({ summary: 'Manually create a new invoice for a customer' })
  async create(@Body() dto: CreateInvoiceDto) {
    const data = await this.service.create(dto);
    return { success: true, data };
  }

  @Patch('invoices/:id')
  @ApiOperation({ summary: 'Update an existing invoice (status, due date, or notes)' })
  async update(@Param('id') id: string, @Body() dto: UpdateInvoiceDto) {
    const data = await this.service.update(id, dto);
    return { success: true, data };
  }

  @Post('invoices/generate')
  @ApiOperation({ summary: 'Bulk generate monthly recurring invoices for all active customers' })
  async generateMonthlyBills(@Body() dto: GenerateBillsDto) {
    const result = await this.service.generateMonthlyBills(dto);
    return result;
  }
}
