import { Controller, Get, Post, Body, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { AccountingService } from './accounting.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JournalFilterDto } from './dto/journal-filter.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Accounting')
@ApiBearerAuth()
@Controller('accounting')
export class AccountingController {
  constructor(private readonly service: AccountingService) {}

  @Get('ledgers')
  @ApiOperation({ summary: 'Get chart of accounts (ledger accounts with balances)' })
  async findLedgerAccounts() {
    const data = await this.service.findLedgerAccounts();
    return { success: true, data };
  }

  @Get('journals')
  @ApiOperation({ summary: 'Get paginated list of double-entry journal entries' })
  async findJournalEntries(@Query() filter: JournalFilterDto) {
    const result = await this.service.findJournalEntries(filter);
    return { success: true, ...result };
  }

  @Post('journals')
  @ApiOperation({ summary: 'Log a manual balanced double-entry journal adjustment' })
  async createJournalEntry(@Body() dto: CreateJournalDto, @CurrentUser('id') userId: string) {
    const data = await this.service.createJournalEntry(dto, userId);
    return { success: true, data };
  }

  @Get('expenses')
  @ApiOperation({ summary: 'Get paginated list of logged expenses' })
  async findExpenses(@Query() filter: ExpenseFilterDto) {
    const result = await this.service.findExpenses(filter);
    return { success: true, ...result };
  }

  @Post('expenses')
  @ApiOperation({ summary: 'Log a business expense and auto-generate corresponding double-entry journals' })
  async createExpense(@Body() dto: CreateExpenseDto, @CurrentUser('id') userId: string) {
    const data = await this.service.createExpense(dto, userId);
    return { success: true, data };
  }

  @Get('reports/statement')
  @ApiOperation({ summary: 'Generate Profit & Loss and Cashflow statement reports' })
  async getFinancialStatements(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string
  ) {
    const data = await this.service.getFinancialStatements(startDate, endDate);
    return { success: true, data };
  }
}
