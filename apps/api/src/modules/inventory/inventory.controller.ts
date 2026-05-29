import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { CreateItemDto } from './dto/create-item.dto';
import { UpdateItemDto } from './dto/update-item.dto';
import { ItemFilterDto } from './dto/item-filter.dto';
import { StockMovementDto } from './dto/stock-movement.dto';
import { AssignAssetDto } from './dto/assign-asset.dto';
import { ReturnAssetDto } from './dto/return-asset.dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Inventory')
@ApiBearerAuth()
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get()
  @ApiOperation({ summary: 'List inventory items with filters and pagination' })
  async findAll(@Query() filter: ItemFilterDto) {
    const result = await this.inventoryService.findAll(filter);
    return { success: true, ...result };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get inventory stats summary' })
  async getStats() {
    const data = await this.inventoryService.getStats();
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get inventory item detailed specs and assignment history' })
  async findOne(@Param('id') id: string) {
    const data = await this.inventoryService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create new stock item entry' })
  async create(@Body() dto: CreateItemDto, @CurrentUser('name') userName: string) {
    const data = await this.inventoryService.create(dto, userName);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update stock item specs' })
  async update(@Param('id') id: string, @Body() dto: UpdateItemDto) {
    const data = await this.inventoryService.update(id, dto);
    return { success: true, data };
  }

  @Post(':id/move')
  @ApiOperation({ summary: 'Record manual stock movement adjustment' })
  async recordMovement(
    @Param('id') id: string,
    @Body() dto: StockMovementDto,
    @CurrentUser('name') userName: string,
  ) {
    const data = await this.inventoryService.recordMovement(id, dto, userName);
    return { success: true, data };
  }

  @Post(':id/assign')
  @ApiOperation({ summary: 'Assign hardware item to customer' })
  async assignToCustomer(
    @Param('id') id: string,
    @Body() dto: AssignAssetDto,
    @CurrentUser('name') userName: string,
  ) {
    const data = await this.inventoryService.assignToCustomer(id, dto, userName);
    return { success: true, data };
  }

  @Post('assignments/:assignmentId/return')
  @ApiOperation({ summary: 'Return hardware item from customer' })
  async returnFromCustomer(
    @Param('assignmentId') assignmentId: string,
    @Body() dto: ReturnAssetDto,
    @CurrentUser('name') userName: string,
  ) {
    const data = await this.inventoryService.returnFromCustomer(assignmentId, dto, userName);
    return { success: true, data };
  }
}
