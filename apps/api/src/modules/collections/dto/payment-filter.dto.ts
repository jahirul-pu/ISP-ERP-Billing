import { IsString, IsOptional, IsEnum, IsInt, Min, IsUUID } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod, CollectionStatus } from '@isp-erp/database';

export class PaymentFilterDto {
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

  @ApiPropertyOptional({ description: 'Search by receipt number, customer name, ID, or phone', example: 'REC-000001' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: CollectionStatus, example: 'PENDING' })
  @IsEnum(CollectionStatus)
  @IsOptional()
  status?: CollectionStatus;

  @ApiPropertyOptional({ description: 'Filter by Collector User UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  collectorId?: string;

  @ApiPropertyOptional({ enum: PaymentMethod, example: 'CASH' })
  @IsEnum(PaymentMethod)
  @IsOptional()
  method?: PaymentMethod;
}
