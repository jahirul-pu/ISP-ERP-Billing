import { IsString, IsOptional, IsEnum, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { InvoiceStatus } from '@isp-erp/database';

export class InvoiceFilterDto {
  @ApiPropertyOptional({ example: 1, default: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Search by invoice number, customer ID, or customer name', example: 'INV-000001' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: InvoiceStatus, example: 'UNPAID' })
  @IsEnum(InvoiceStatus)
  @IsOptional()
  status?: InvoiceStatus;

  @ApiPropertyOptional({ description: 'Filter by Customer UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  customerId?: string;

  @ApiPropertyOptional({ description: 'Filter by billing month (Format: YYYY-MM)', example: '2026-05' })
  @IsString()
  @IsOptional()
  billingMonth?: string;
}
