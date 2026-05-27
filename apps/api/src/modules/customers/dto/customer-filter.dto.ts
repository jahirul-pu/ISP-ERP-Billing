import { IsOptional, IsString, IsNumber, IsBoolean, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CustomerFilterDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'DUE_WARNING', 'GRACE_PERIOD', 'SUSPENDED', 'TEMPORARY_DISCONNECT', 'LEFT_CUSTOMER', 'DEAD_CONNECTION', 'MIGRATED'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: ['HOME', 'CORPORATE', 'SHARED', 'VIP', 'TEMPORARY', 'FRANCHISE'] })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  areaId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  zoneId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  collectorId?: string;

  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  isOnline?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @Type(() => Number)
  @IsNumber()
  @IsOptional()
  limit?: number = 20;
}
