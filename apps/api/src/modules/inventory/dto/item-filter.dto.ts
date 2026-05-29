import { IsString, IsOptional, IsEnum, IsUUID, IsInt, Min, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ItemFilterDto {
  @ApiPropertyOptional({ default: 1, example: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20, example: 20 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Search term for name or serial number', example: 'TP-Link' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['ROUTER', 'SWITCH', 'ONU', 'CABLE', 'SPLICE_BOX', 'BATTERY', 'OTHER'], example: 'ROUTER' })
  @IsEnum(['ROUTER', 'SWITCH', 'ONU', 'CABLE', 'SPLICE_BOX', 'BATTERY', 'OTHER'])
  @IsOptional()
  type?: 'ROUTER' | 'SWITCH' | 'ONU' | 'CABLE' | 'SPLICE_BOX' | 'BATTERY' | 'OTHER';

  @ApiPropertyOptional({ enum: ['NEW', 'GOOD', 'DAMAGED', 'REPAIR', 'DISPOSED'], example: 'NEW' })
  @IsEnum(['NEW', 'GOOD', 'DAMAGED', 'REPAIR', 'DISPOSED'])
  @IsOptional()
  condition?: 'NEW' | 'GOOD' | 'DAMAGED' | 'REPAIR' | 'DISPOSED';

  @ApiPropertyOptional({ description: 'Filter by POP location UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  popId?: string;

  @ApiPropertyOptional({ description: 'Filter by assignment status (true = assigned, false = instock)', example: false })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  isAssigned?: boolean;
}
