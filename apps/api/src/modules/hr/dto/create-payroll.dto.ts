import { IsUUID, IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePayrollDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ description: 'Payroll month, typically first day of month (e.g. 2026-05-01)', example: '2026-05-01T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  month: Date;

  @ApiPropertyOptional({ default: 0, example: 5000 })
  @IsNumber()
  @IsOptional()
  bonus?: number;

  @ApiPropertyOptional({ default: 0, example: 1000 })
  @IsNumber()
  @IsOptional()
  deductions?: number;

  @ApiPropertyOptional({ default: 0, example: 2000 })
  @IsNumber()
  @IsOptional()
  advances?: number;

  @ApiPropertyOptional({ default: 0, example: 1500 })
  @IsNumber()
  @IsOptional()
  incentives?: number;

  @ApiPropertyOptional({ default: 0, example: 1200 })
  @IsNumber()
  @IsOptional()
  commission?: number;

  @ApiPropertyOptional({ example: 'Eid bonus and mobile bill incentive included' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
