import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeFilterDto } from './dto/employee-filter.dto';
import { RecordAttendanceDto } from './dto/record-attendance.dto';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { PayrollFilterDto } from './dto/payroll-filter.dto';
import { createPaginationMeta, generateId } from '@isp-erp/shared';
import { Prisma, LedgerType, ExpenseCategory } from '@isp-erp/database';

@Injectable()
export class HrService {
  constructor(private prisma: PrismaService) {}

  // ─── Employee Management ──────────────────────────────────────

  async createEmployee(dto: CreateEmployeeDto) {
    // 1. Generate new employee ID sequence
    const counter = await this.prisma.sequenceCounter.upsert({
      where: { name: 'employee_id' },
      update: { current: { increment: 1 } },
      create: { name: 'employee_id', current: 1 },
    });
    const employeeId = generateId('EMP', counter.current);

    // 2. Validate userId if provided
    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });
      if (!user) {
        throw new NotFoundException(`Linked user account with ID ${dto.userId} not found`);
      }
      // Check if user is already linked to another employee
      const existingLink = await this.prisma.employee.findUnique({
        where: { userId: dto.userId },
      });
      if (existingLink) {
        throw new BadRequestException('User account is already linked to another employee record');
      }
    }

    return this.prisma.employee.create({
      data: {
        employeeId,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        department: dto.department,
        designation: dto.designation,
        baseSalary: dto.baseSalary ?? 0,
        status: dto.status ?? 'ACTIVE',
        joinDate: dto.joinDate ?? new Date(),
        userId: dto.userId || null,
      },
    });
  }

  async updateEmployee(id: string, dto: UpdateEmployeeDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    if (dto.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: dto.userId },
      });
      if (!user) {
        throw new NotFoundException(`Linked user account with ID ${dto.userId} not found`);
      }
      if (dto.userId !== employee.userId) {
        const existingLink = await this.prisma.employee.findUnique({
          where: { userId: dto.userId },
        });
        if (existingLink) {
          throw new BadRequestException('User account is already linked to another employee record');
        }
      }
    }

    return this.prisma.employee.update({
      where: { id },
      data: {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        department: dto.department,
        designation: dto.designation,
        baseSalary: dto.baseSalary,
        status: dto.status,
        joinDate: dto.joinDate,
        userId: dto.userId === null ? null : dto.userId,
      },
    });
  }

  async findAllEmployees(filter: EmployeeFilterDto) {
    const { page = 1, limit = 20, search, status } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeeWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { employeeId: { contains: search } },
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } },
        { department: { contains: search } },
        { designation: { contains: search } },
      ];
    }

    const [employees, total] = await Promise.all([
      this.prisma.employee.findMany({
        where,
        skip,
        take: limit,
        orderBy: { employeeId: 'asc' },
      }),
      this.prisma.employee.count({ where }),
    ]);

    return {
      data: employees,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async findOneEmployee(id: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { id },
      include: {
        payrollRecords: {
          orderBy: { month: 'desc' },
        },
        attendance: {
          orderBy: { date: 'desc' },
          take: 30, // Limit to recent 30 records
        },
      },
    });

    if (!employee) {
      throw new NotFoundException(`Employee with ID ${id} not found`);
    }

    // Resolve user account link if exists
    let userDetails = null;
    if (employee.userId) {
      const user = await this.prisma.user.findUnique({
        where: { id: employee.userId },
        select: { id: true, name: true, email: true },
      });
      if (user) {
        userDetails = user;
      }
    }

    return {
      ...employee,
      user: userDetails,
    };
  }

  // ─── Attendance Records ───────────────────────────────────────

  async recordAttendance(dto: RecordAttendanceDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);
    }

    // Normalize date to start of day
    const attendanceDate = new Date(dto.date);
    attendanceDate.setUTCHours(0, 0, 0, 0);

    return this.prisma.attendanceRecord.upsert({
      where: {
        employeeId_date: {
          employeeId: dto.employeeId,
          date: attendanceDate,
        },
      },
      update: {
        status: dto.status,
        checkIn: dto.checkIn || null,
        checkOut: dto.checkOut || null,
        remarks: dto.remarks || null,
      },
      create: {
        employeeId: dto.employeeId,
        date: attendanceDate,
        status: dto.status,
        checkIn: dto.checkIn || null,
        checkOut: dto.checkOut || null,
        remarks: dto.remarks || null,
      },
    });
  }

  async recordBulkAttendance(records: RecordAttendanceDto[]) {
    return this.prisma.$transaction(async (tx) => {
      const upserts = [];
      for (const record of records) {
        const employee = await tx.employee.findUnique({
          where: { id: record.employeeId },
        });
        if (!employee) {
          throw new NotFoundException(`Employee with ID ${record.employeeId} not found`);
        }

        const attendanceDate = new Date(record.date);
        attendanceDate.setUTCHours(0, 0, 0, 0);

        const upserted = await tx.attendanceRecord.upsert({
          where: {
            employeeId_date: {
              employeeId: record.employeeId,
              date: attendanceDate,
            },
          },
          update: {
            status: record.status,
            checkIn: record.checkIn || null,
            checkOut: record.checkOut || null,
            remarks: record.remarks || null,
          },
          create: {
            employeeId: record.employeeId,
            date: attendanceDate,
            status: record.status,
            checkIn: record.checkIn || null,
            checkOut: record.checkOut || null,
            remarks: record.remarks || null,
          },
        });
        upserts.push(upserted);
      }
      return upserts;
    });
  }

  async getAttendanceHistory(employeeId: string, startDate?: Date, endDate?: Date) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${employeeId} not found`);
    }

    const where: Prisma.AttendanceRecordWhereInput = { employeeId };

    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    return this.prisma.attendanceRecord.findMany({
      where,
      orderBy: { date: 'asc' },
    });
  }

  async getDailyAttendance(dateStr: string) {
    const filterDate = new Date(dateStr);
    filterDate.setUTCHours(0, 0, 0, 0);

    // Get all active employees
    const employees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      orderBy: { employeeId: 'asc' },
    });

    // Get attendance records for this date
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { date: filterDate },
    });

    const recordMap = new Map(attendanceRecords.map((r) => [r.employeeId, r]));

    // Return combined dataset
    return employees.map((employee) => {
      const record = recordMap.get(employee.id);
      return {
        employeeId: employee.id,
        employeeCode: employee.employeeId,
        employeeName: employee.name,
        department: employee.department,
        designation: employee.designation,
        date: filterDate,
        status: record ? record.status : null,
        checkIn: record ? record.checkIn : null,
        checkOut: record ? record.checkOut : null,
        remarks: record ? record.remarks : null,
        recordId: record ? record.id : null,
      };
    });
  }

  // ─── Payroll Management ───────────────────────────────────────

  async generatePayroll(dto: CreatePayrollDto) {
    const employee = await this.prisma.employee.findUnique({
      where: { id: dto.employeeId },
    });
    if (!employee) {
      throw new NotFoundException(`Employee with ID ${dto.employeeId} not found`);
    }

    // Normalize month to first day
    const payrollMonth = new Date(dto.month);
    payrollMonth.setUTCDate(1);
    payrollMonth.setUTCHours(0, 0, 0, 0);

    // Check for duplicate payroll records for this month
    const existing = await this.prisma.payrollRecord.findUnique({
      where: {
        employeeId_month: {
          employeeId: dto.employeeId,
          month: payrollMonth,
        },
      },
    });
    if (existing) {
      throw new ConflictException(
        `Payroll record already generated for employee ${employee.name} in month ${payrollMonth.toISOString().split('T')[0]}`
      );
    }

    const baseSalary = employee.baseSalary;
    const bonus = dto.bonus ?? 0;
    const deductions = dto.deductions ?? 0;
    const advances = dto.advances ?? 0;
    const incentives = dto.incentives ?? 0;
    const commission = dto.commission ?? 0;

    const netSalary = baseSalary + bonus + incentives + commission - deductions - advances;

    return this.prisma.payrollRecord.create({
      data: {
        employeeId: dto.employeeId,
        month: payrollMonth,
        baseSalary,
        bonus,
        deductions,
        advances,
        incentives,
        commission,
        netSalary,
        isPaid: false,
        remarks: dto.remarks,
      },
      include: {
        employee: { select: { id: true, name: true, employeeId: true } },
      },
    });
  }

  async payPayroll(id: string, paidFromAccountId: string, userId: string, remarks?: string) {
    const payroll = await this.prisma.payrollRecord.findUnique({
      where: { id },
      include: { employee: true },
    });
    if (!payroll) {
      throw new NotFoundException(`Payroll record with ID ${id} not found`);
    }
    if (payroll.isPaid) {
      throw new BadRequestException(`Payroll record for ${payroll.employee.name} has already been paid`);
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Verify Cash/Bank Asset Account exists
      const assetAccount = await tx.ledgerAccount.findUnique({
        where: { id: paidFromAccountId },
      });
      if (!assetAccount) {
        throw new NotFoundException(`Payment account with ID ${paidFromAccountId} not found`);
      }

      // 2. Find Salary Expense Ledger Account (code 5003)
      let salaryExpenseAccount = await tx.ledgerAccount.findFirst({
        where: {
          type: LedgerType.EXPENSE,
          name: { contains: 'Salary' },
        },
      });

      // Default to Maintenance Expense if not configured
      if (!salaryExpenseAccount) {
        salaryExpenseAccount = await tx.ledgerAccount.findFirst({
          where: { name: 'Maintenance Expense' },
        });
      }

      if (!salaryExpenseAccount) {
        throw new NotFoundException('No matching expense ledger account configured in system');
      }

      // 3. Mark payroll as paid
      const updatedPayroll = await tx.payrollRecord.update({
        where: { id },
        data: {
          isPaid: true,
          paidAt: new Date(),
          remarks: remarks || payroll.remarks,
        },
      });

      // 4. Create general Expense entry
      const monthStr = payroll.month.toISOString().split('T')[0].substring(0, 7); // e.g. "2026-05"
      const description = `Salary Payment for ${payroll.employee.name} (${payroll.employee.employeeId}) for month ${monthStr}`;
      
      const createdExpense = await tx.expense.create({
        data: {
          category: ExpenseCategory.SALARY,
          description,
          amount: payroll.netSalary,
          paidFrom: assetAccount.name,
          date: new Date(),
        },
      });

      // 5. Generate balanced double-entry Journal Entry (Debit: Salary Expense, Credit: Cash/Bank Asset)
      const counter = await tx.sequenceCounter.update({
        where: { name: 'journal_entry' },
        data: { current: { increment: 1 } },
      });
      const entryNumber = generateId('JE', counter.current);

      await tx.journalEntry.create({
        data: {
          entryNumber,
          description: `Salary Expense: ${description}`,
          reference: createdExpense.id,
          referenceType: 'expense',
          date: new Date(),
          createdById: userId,
          lines: {
            create: [
              {
                accountId: salaryExpenseAccount.id,
                debit: payroll.netSalary,
                credit: 0,
                description: `Debit payroll salary expense`,
              },
              {
                accountId: assetAccount.id,
                debit: 0,
                credit: payroll.netSalary,
                description: `Credit asset account: ${assetAccount.name}`,
              },
            ],
          },
        },
      });

      // 6. Adjust ledger balances
      // Debit increases expense account balance
      await tx.ledgerAccount.update({
        where: { id: salaryExpenseAccount.id },
        data: { balance: { increment: payroll.netSalary } },
      });

      // Credit decreases asset account balance
      await tx.ledgerAccount.update({
        where: { id: assetAccount.id },
        data: { balance: { decrement: payroll.netSalary } },
      });

      return updatedPayroll;
    });
  }

  async findAllPayroll(filter: PayrollFilterDto) {
    const { page = 1, limit = 20, employeeId, month, isPaid } = filter;
    const skip = (page - 1) * limit;

    const where: Prisma.PayrollRecordWhereInput = {};

    if (employeeId) where.employeeId = employeeId;
    if (isPaid !== undefined) where.isPaid = isPaid;

    if (month) {
      const startOfMonth = new Date(month);
      startOfMonth.setUTCDate(1);
      startOfMonth.setUTCHours(0, 0, 0, 0);
      where.month = startOfMonth;
    }

    const [records, total] = await Promise.all([
      this.prisma.payrollRecord.findMany({
        where,
        skip,
        take: limit,
        include: {
          employee: { select: { id: true, name: true, employeeId: true, department: true, designation: true } },
        },
        orderBy: { month: 'desc' },
      }),
      this.prisma.payrollRecord.count({ where }),
    ]);

    return {
      data: records,
      meta: createPaginationMeta(total, page, limit),
    };
  }

  async getHRStats() {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const activeEmployeesCount = await this.prisma.employee.count({
      where: { status: 'ACTIVE' },
    });

    const activeEmployees = await this.prisma.employee.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, baseSalary: true },
    });

    const monthlySalaryBudget = activeEmployees.reduce((sum, e) => sum + e.baseSalary, 0);

    // Attendance stats for today
    const attendanceRecords = await this.prisma.attendanceRecord.findMany({
      where: { date: today },
    });

    const presentCount = attendanceRecords.filter((r) => r.status === 'PRESENT' || r.status === 'ON_FIELD').length;
    const attendanceRate = activeEmployeesCount > 0 ? Math.round((presentCount / activeEmployeesCount) * 100) : 0;

    // Unpaid payroll count for current month
    const startOfMonth = new Date();
    startOfMonth.setUTCDate(1);
    startOfMonth.setUTCHours(0, 0, 0, 0);

    const unpaidRecords = await this.prisma.payrollRecord.findMany({
      where: { isPaid: false },
      select: { netSalary: true },
    });

    const outstandingPayrollLiabilities = unpaidRecords.reduce((sum, r) => sum + r.netSalary, 0);

    return {
      activeEmployees: activeEmployeesCount,
      monthlySalaryBudget,
      todayAttendanceRate: attendanceRate,
      outstandingPayroll: outstandingPayrollLiabilities,
    };
  }
}
