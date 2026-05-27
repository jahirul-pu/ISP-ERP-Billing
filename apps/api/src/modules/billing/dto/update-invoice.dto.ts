import { IsString, IsOptional, IsEnum, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@isp-erp/database';

export class UpdateInvoiceDto {
  @ApiPropertyOptional({ enum: InvoiceStatus, example: 'PAID' })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional({ example: '2026-05-15T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  dueDate?: Date;

  @ApiPropertyOptional({ example: 'Waived due to service outage' })
  @IsString()
  @IsOptional()
  notes?: string;
}
