import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateJournalDto } from './dto/create-journal.dto';
import { JournalFilterDto } from './dto/journal-filter.dto';
import { ExpenseFilterDto } from './dto/expense-filter.dto';
import { createPaginationMeta, generateId } from '@isp-erp/shared';
import { Prisma, LedgerType, ExpenseCategory } from '@isp-erp/database';

@Injectable()
export class AccountingService {
  constructor(private prisma: PrismaService) {}

  async findLedgerAccounts() {
    return this.prisma.ledgerAccount.findMany({
      orderBy: { code: 'asc' },
    });
  }

  async findJournalEntries(filter: JournalFilterDto) {
    const { page = 1, limit = 20, search, startDate, endDate } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.JournalEntryWhereInput = {};

    if (startDate || endDate) {
      where.date = {};
      if (startDate) {
        where.date.gte = new Date(startDate);
      }
      if (endDate) {
        where.date.lte = new Date(endDate);
      }
    }

    if (search) {
      where.OR = [
        { entryNumber: { contains: search } },
        { description: { contains: search } },
        { reference: { contains: search } },
      ];
    }

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        skip,
        take: limit,
        include: {
          lines: {
            include: {
              account: {
                select: { id: true, name: true, code: true, type: true },
              },
            },
          },
          createdBy: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return {
      data: entries,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async createJournalEntry(dto: CreateJournalDto, userId: string) {
    const { description, reference, referenceType, date = new Date(), lines } = dto;

    // Enforce double entry check
    let totalDebit = 0;
    let totalCredit = 0;

    for (const line of lines) {
      totalDebit += line.debit ?? 0;
      totalCredit += line.credit ?? 0;
    }

    // Check discrepancy with float threshold
    if (Math.abs(totalDebit - totalCredit) > 0.001) {
      throw new BadRequestException(
        `Journal entry is out of balance. Total debits (${totalDebit}) must equal total credits (${totalCredit}).`
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Get next sequence number
      const counter = await tx.sequenceCounter.update({
        where: { name: 'journal_entry' },
        data: { current: { increment: 1 } },
      });
      const entryNumber = generateId('JE', counter.current);

      // 2. Create the Journal Entry and Lines
      const createdEntry = await tx.journalEntry.create({
        data: {
          entryNumber,
          description,
          reference,
          referenceType,
          date,
          createdById: userId,
          lines: {
            create: lines.map((l) => ({
              accountId: l.accountId,
              debit: l.debit ?? 0,
              credit: l.credit ?? 0,
              description: l.description,
            })),
          },
        },
        include: {
          lines: true,
        },
      });

      // 3. Adjust balances of individual ledger accounts
      for (const line of lines) {
        const account = await tx.ledgerAccount.findUnique({
          where: { id: line.accountId },
        });

        if (!account) {
          throw new NotFoundException(`Ledger Account with ID ${line.accountId} not found`);
        }

        const debit = line.debit ?? 0;
        const credit = line.credit ?? 0;
        let balanceAdjustment = 0;

        if (account.type === LedgerType.ASSET || account.type === LedgerType.EXPENSE) {
          // Debits increase asset/expense, Credits decrease
          balanceAdjustment = debit - credit;
        } else {
          // Credits increase liabilities/equity/revenues, Debits decrease
          balanceAdjustment = credit - debit;
        }

        await tx.ledgerAccount.update({
          where: { id: account.id },
          data: {
            balance: { increment: balanceAdjustment },
          },
        });
      }

      return createdEntry;
    });

    return result;
  }

  async findExpenses(filter: ExpenseFilterDto) {
    const { page = 1, limit = 20, category, startDate, endDate } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {};

    if (category) where.category = category;

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const [expenses, total] = await Promise.all([
      this.prisma.expense.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' },
      }),
      this.prisma.expense.count({ where }),
    ]);

    return {
      data: expenses,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async createExpense(dto: CreateExpenseDto, userId: string) {
    const { category, description, amount, paidFrom, receipt, date = new Date() } = dto;

    const expense = await this.prisma.$transaction(async (tx) => {
      // 1. Verify Cash/Bank Asset Account exists
      const assetAccount = await tx.ledgerAccount.findUnique({
        where: { id: paidFrom },
      });
      if (!assetAccount) {
        throw new NotFoundException(`Asset account paidFrom with ID ${paidFrom} not found`);
      }

      // 2. Find matching expense ledger account
      let expenseAccount = await tx.ledgerAccount.findFirst({
        where: {
          type: LedgerType.EXPENSE,
          name: { contains: category === ExpenseCategory.BANDWIDTH ? 'Bandwidth' : category === ExpenseCategory.ELECTRICITY ? 'Electricity' : category === ExpenseCategory.SALARY ? 'Salary' : 'Maintenance' },
        },
      });

      // Default to Maintenance Expense if no match found
      if (!expenseAccount) {
        expenseAccount = await tx.ledgerAccount.findFirst({
          where: { name: 'Maintenance Expense' },
        });
      }

      if (!expenseAccount) {
        throw new NotFoundException('No default expense account configured in system ledgers');
      }

      // 3. Log the Expense record
      const createdExpense = await tx.expense.create({
        data: {
          category,
          description,
          amount,
          paidFrom: assetAccount.name,
          receipt,
          date,
        },
      });

      // 4. Generate Balanced Double Entry (Debit: Expense, Credit: Asset)
      const counter = await tx.sequenceCounter.update({
        where: { name: 'journal_entry' },
        data: { current: { increment: 1 } },
      });
      const entryNumber = generateId('JE', counter.current);

      await tx.journalEntry.create({
        data: {
          entryNumber,
          description: `Expense: ${description}`,
          reference: createdExpense.id,
          referenceType: 'expense',
          date,
          createdById: userId,
          lines: {
            create: [
              {
                accountId: expenseAccount.id,
                debit: amount,
                credit: 0,
                description: `Debit expense category: ${category}`,
              },
              {
                accountId: assetAccount.id,
                debit: 0,
                credit: amount,
                description: `Credit asset account: ${assetAccount.name}`,
              },
            ],
          },
        },
      });

      // 5. Update Ledger Balances
      // Debit to Expense Account increases it
      await tx.ledgerAccount.update({
        where: { id: expenseAccount.id },
        data: { balance: { increment: amount } },
      });

      // Credit to Asset Account decreases it
      await tx.ledgerAccount.update({
        where: { id: assetAccount.id },
        data: { balance: { decrement: amount } },
      });

      return createdExpense;
    });

    return expense;
  }

  async getFinancialStatements(startDateStr?: string, endDateStr?: string) {
    const where: Prisma.JournalLineWhereInput = {};
    if (startDateStr || endDateStr) {
      const dateFilter: Prisma.DateTimeFilter = {};
      if (startDateStr) dateFilter.gte = new Date(startDateStr);
      if (endDateStr) dateFilter.lte = new Date(endDateStr);
      where.entry = {
        date: dateFilter,
      };
    }

    const ledgers = await this.prisma.ledgerAccount.findMany();

    // 1. Profit & Loss: Revenue vs Expense
    const revenues = ledgers.filter((l) => l.type === LedgerType.REVENUE);
    const expenses = ledgers.filter((l) => l.type === LedgerType.EXPENSE);

    const revenueStatement = revenues.map((r) => ({
      accountId: r.id,
      name: r.name,
      code: r.code,
      balance: r.balance,
    }));

    const expenseStatement = expenses.map((e) => ({
      accountId: e.id,
      name: e.name,
      code: e.code,
      balance: e.balance,
    }));

    const totalRevenue = revenueStatement.reduce((sum, r) => sum + r.balance, 0);
    const totalExpense = expenseStatement.reduce((sum, e) => sum + e.balance, 0);
    const netProfit = totalRevenue - totalExpense;

    // 2. Simplified Cash Flow (Transactions on Cash and Bank accounts)
    const cashBankAccounts = ledgers.filter(
      (l) => l.type === LedgerType.ASSET && (l.name.toLowerCase().includes('cash') || l.name.toLowerCase().includes('bank'))
    );

    const cashBankIds = cashBankAccounts.map((c) => c.id);

    // Get all line items for cash/bank ledger accounts within date range
    const cashLines = await this.prisma.journalLine.findMany({
      where: {
        accountId: { in: cashBankIds },
        ...where,
      },
    });

    const inflows = cashLines.reduce((sum, line) => sum + line.debit, 0);
    const outflows = cashLines.reduce((sum, line) => sum + line.credit, 0);
    const netCashFlow = inflows - outflows;

    return {
      profitAndLoss: {
        revenues: revenueStatement,
        expenses: expenseStatement,
        totalRevenue,
        totalExpense,
        netProfit,
      },
      cashFlow: {
        inflows,
        outflows,
        netCashFlow,
        cashAccounts: cashBankAccounts.map((c) => ({ id: c.id, name: c.name, balance: c.balance })),
      },
    };
  }
}
