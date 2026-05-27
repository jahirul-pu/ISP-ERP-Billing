import { Controller, Get, Post, Patch, Delete, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { CustomerFilterDto } from './dto/customer-filter.dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(private readonly customersService: CustomersService) {}

  @Get()
  @ApiOperation({ summary: 'List customers with filters' })
  async findAll(@Query() filter: CustomerFilterDto) {
    return { success: true, ...(await this.customersService.findAll(filter)) };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get customer statistics' })
  async getStats() {
    return { success: true, data: await this.customersService.getStats() };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get customer by ID' })
  async findOne(@Param('id') id: string) {
    return { success: true, data: await this.customersService.findOne(id) };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new customer' })
  async create(@Body() dto: CreateCustomerDto) {
    return { success: true, data: await this.customersService.create(dto) };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update customer' })
  async update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return { success: true, data: await this.customersService.update(id, dto) };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Change customer status' })
  async updateStatus(@Param('id') id: string, @Body('status') status: string) {
    return { success: true, data: await this.customersService.updateStatus(id, status) };
  }

  @Get(':id/notes')
  @ApiOperation({ summary: 'Get customer notes' })
  async getNotes(@Param('id') id: string) {
    return { success: true, data: await this.customersService.getNotes(id) };
  }

  @Post(':id/notes')
  @ApiOperation({ summary: 'Add customer note' })
  async addNote(
    @Param('id') id: string,
    @Body() body: { content: string; category?: string },
    @CurrentUser('sub') userId: string,
  ) {
    return {
      success: true,
      data: await this.customersService.addNote(id, body.content, body.category, userId),
    };
  }
}
