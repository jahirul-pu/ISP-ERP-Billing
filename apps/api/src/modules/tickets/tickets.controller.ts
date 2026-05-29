import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { TicketFilterDto } from './dto/ticket-filter.dto';
import { CreateCommentDto } from './dto/create-comment.dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('Tickets')
@ApiBearerAuth()
@Controller('tickets')
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Get()
  @ApiOperation({ summary: 'List tickets with filters and pagination' })
  async findAll(@Query() filter: TicketFilterDto) {
    const result = await this.ticketsService.findAll(filter);
    return { success: true, ...result };
  }

  @Get('stats')
  @ApiOperation({ summary: 'Get support ticket stats' })
  async getStats() {
    const data = await this.ticketsService.getStats();
    return { success: true, data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket detailed information' })
  async findOne(@Param('id') id: string) {
    const data = await this.ticketsService.findOne(id);
    return { success: true, data };
  }

  @Post()
  @ApiOperation({ summary: 'Create a new support ticket' })
  async create(@Body() dto: CreateTicketDto, @CurrentUser('sub') userId: string) {
    const data = await this.ticketsService.create(dto, userId);
    return { success: true, data };
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket details, priority, technician, or status' })
  async update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    const data = await this.ticketsService.update(id, dto);
    return { success: true, data };
  }

  @Get(':id/comments')
  @ApiOperation({ summary: 'Get comments log for a ticket' })
  async getComments(@Param('id') id: string) {
    const data = await this.ticketsService.getComments(id);
    return { success: true, data };
  }

  @Post(':id/comments')
  @ApiOperation({ summary: 'Add a new comment thread to a ticket' })
  async addComment(
    @Param('id') id: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.ticketsService.addComment(id, dto, userId);
    return { success: true, data };
  }
}
