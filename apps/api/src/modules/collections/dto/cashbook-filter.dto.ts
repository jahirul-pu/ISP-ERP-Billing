import { IsString, IsOptional, IsEnum, IsUUID, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CollectionStatus } from '@isp-erp/database';

export class CashbookFilterDto {
  @ApiPropertyOptional({ description: 'Filter by Collector User UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  collectorId?: string;

  @ApiPropertyOptional({ enum: CollectionStatus, example: 'SUBMITTED' })
  @IsEnum(CollectionStatus)
  @IsOptional()
  status?: CollectionStatus;

  @ApiPropertyOptional({ description: 'Filter by specific date (Format: YYYY-MM-DD)', example: '2026-05-27' })
  @IsString()
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must be in YYYY-MM-DD format' })
  date?: string;
}
