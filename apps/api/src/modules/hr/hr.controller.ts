import { Controller, Get, Post, Patch, Body, Param, Query } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { HrService } from './hr.service';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeeFilterDto } from './dto/employee-filter.dto';
import { RecordAttendanceDto, BulkRecordAttendanceDto } from './dto/record-attendance.dto';
import { CreatePayrollDto } from './dto/create-payroll.dto';
import { PayrollFilterDto } from './dto/payroll-filter.dto';
import { PayPayrollDto } from './dto/pay-payroll.dto';
import { CurrentUser } from '../../common/decorators';

@ApiTags('HR & Payroll')
@ApiBearerAuth()
@Controller('hr')
export class HrController {
  constructor(private readonly hrService: HrService) {}

  // ─── Employees ────────────────────────────────────────────────

  @Get('employees')
  @ApiOperation({ summary: 'List employees with search filters and pagination' })
  async findAllEmployees(@Query() filter: EmployeeFilterDto) {
    const result = await this.hrService.findAllEmployees(filter);
    return { success: true, ...result };
  }

  @Get('employees/stats')
  @ApiOperation({ summary: 'Get HR and employee KPIs summary' })
  async getHRStats() {
    const data = await this.hrService.getHRStats();
    return { success: true, data };
  }

  @Get('employees/:id')
  @ApiOperation({ summary: 'Get employee profile with attendance and payroll logs' })
  async findOneEmployee(@Param('id') id: string) {
    const data = await this.hrService.findOneEmployee(id);
    return { success: true, data };
  }

  @Post('employees')
  @ApiOperation({ summary: 'Create new employee profile' })
  async createEmployee(@Body() dto: CreateEmployeeDto) {
    const data = await this.hrService.createEmployee(dto);
    return { success: true, data };
  }

  @Patch('employees/:id')
  @ApiOperation({ summary: 'Update employee profile details' })
  async updateEmployee(@Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    const data = await this.hrService.updateEmployee(id, dto);
    return { success: true, data };
  }

  // ─── Attendance ───────────────────────────────────────────────

  @Get('attendance/daily')
  @ApiOperation({ summary: 'Get daily roster sheet for active staff' })
  async getDailyAttendance(@Query('date') date: string) {
    const data = await this.hrService.getDailyAttendance(date);
    return { success: true, data };
  }

  @Post('attendance')
  @ApiOperation({ summary: 'Submit daily attendance check-ins roster (supports bulk array)' })
  async recordAttendance(@Body() dto: BulkRecordAttendanceDto) {
    const data = await this.hrService.recordBulkAttendance(dto.records);
    return { success: true, data };
  }

  @Get('attendance/employee/:employeeId')
  @ApiOperation({ summary: 'Get attendance history list for a single employee' })
  async getAttendanceHistory(
    @Param('employeeId') employeeId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    const data = await this.hrService.getAttendanceHistory(employeeId, start, end);
    return { success: true, data };
  }

  // ─── Payroll ──────────────────────────────────────────────────

  @Get('payroll')
  @ApiOperation({ summary: 'List generated payroll month logs' })
  async findAllPayroll(@Query() filter: PayrollFilterDto) {
    const result = await this.hrService.findAllPayroll(filter);
    return { success: true, ...result };
  }

  @Post('payroll')
  @ApiOperation({ summary: 'Generate monthly payroll slip for an employee' })
  async generatePayroll(@Body() dto: CreatePayrollDto) {
    const data = await this.hrService.generatePayroll(dto);
    return { success: true, data };
  }

  @Post('payroll/:id/pay')
  @ApiOperation({ summary: 'Mark payroll slip paid and post accounting double-entry adjustments' })
  async payPayroll(
    @Param('id') id: string,
    @Body() dto: PayPayrollDto,
    @CurrentUser('sub') userId: string,
  ) {
    const data = await this.hrService.payPayroll(id, dto.paidFromAccountId, userId, dto.remarks);
    return { success: true, data };
  }
}
