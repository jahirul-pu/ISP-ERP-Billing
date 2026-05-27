import { IsString, IsNotEmpty, IsDate, Matches } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GenerateBillsDto {
  @ApiProperty({ description: 'Billing month in YYYY-MM format', example: '2026-05' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{4}-\d{2}$/, { message: 'billingMonth must be in YYYY-MM format' })
  billingMonth: string;

  @ApiProperty({ description: 'Due date for the generated invoices', example: '2026-05-10T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsNotEmpty()
  dueDate: Date;
}
