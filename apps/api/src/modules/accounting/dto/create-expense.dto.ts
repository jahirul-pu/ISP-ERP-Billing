import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsUUID, IsDate, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ExpenseCategory } from '@isp-erp/database';

export class CreateExpenseDto {
  @ApiProperty({ enum: ExpenseCategory, example: 'ELECTRICITY' })
  @IsEnum(ExpenseCategory)
  @IsNotEmpty()
  category: ExpenseCategory;

  @ApiProperty({ example: 'Electricity bill for Uttara POP - May 2026' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 4500 })
  @IsNumber()
  @Min(0.01, { message: 'amount must be greater than 0' })
  amount: number;

  @ApiProperty({ description: 'Asset account UUID (Cash/Bank) paid from', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  paidFrom: string;

  @ApiPropertyOptional({ example: 'https://storage.isp-erp.local/receipts/exp-001.jpg' })
  @IsString()
  @IsOptional()
  receipt?: string;

  @ApiPropertyOptional({ example: '2026-05-27T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  date?: Date;
}
