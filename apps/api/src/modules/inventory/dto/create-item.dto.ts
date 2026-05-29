import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateItemDto {
  @ApiProperty({ example: 'TP-Link WR840N Router' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ enum: ['ROUTER', 'SWITCH', 'ONU', 'CABLE', 'SPLICE_BOX', 'BATTERY', 'OTHER'], example: 'ROUTER' })
  @IsEnum(['ROUTER', 'SWITCH', 'ONU', 'CABLE', 'SPLICE_BOX', 'BATTERY', 'OTHER'])
  type: 'ROUTER' | 'SWITCH' | 'ONU' | 'CABLE' | 'SPLICE_BOX' | 'BATTERY' | 'OTHER';

  @ApiPropertyOptional({ example: 'S/N1234567890' })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ enum: ['NEW', 'GOOD', 'DAMAGED', 'REPAIR', 'DISPOSED'], default: 'NEW', example: 'NEW' })
  @IsEnum(['NEW', 'GOOD', 'DAMAGED', 'REPAIR', 'DISPOSED'])
  @IsOptional()
  condition?: 'NEW' | 'GOOD' | 'DAMAGED' | 'REPAIR' | 'DISPOSED';

  @ApiPropertyOptional({ default: 1, example: 1 })
  @IsNumber()
  @IsOptional()
  quantity?: number;

  @ApiPropertyOptional({ example: 'TP-Link Bangladesh Ltd.' })
  @IsString()
  @IsOptional()
  supplier?: string;

  @ApiPropertyOptional({ example: '2026-05-28T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  purchaseDate?: Date;

  @ApiPropertyOptional({ example: 1200 })
  @IsNumber()
  @IsOptional()
  purchasePrice?: number;

  @ApiPropertyOptional({ description: 'POP location UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  popId?: string;
}
