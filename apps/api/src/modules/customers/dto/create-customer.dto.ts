import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '01712345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  altPhone?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  altContact?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  address?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  gpsLat?: number;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  gpsLng?: number;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  nidNumber?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  businessInfo?: string;

  @ApiPropertyOptional({ enum: ['HOME', 'CORPORATE', 'SHARED', 'VIP', 'TEMPORARY', 'FRANCHISE'] })
  @IsString()
  @IsOptional()
  type?: string;

  @ApiProperty({ description: 'Area ID' })
  @IsUUID()
  @IsNotEmpty()
  areaId: string;

  @ApiProperty({ description: 'Zone ID' })
  @IsUUID()
  @IsNotEmpty()
  zoneId: string;

  @ApiProperty({ description: 'POP ID' })
  @IsUUID()
  @IsNotEmpty()
  popId: string;

  @ApiPropertyOptional({ description: 'Package ID' })
  @IsUUID()
  @IsOptional()
  packageId?: string;

  @ApiPropertyOptional({ description: 'Collector User ID' })
  @IsUUID()
  @IsOptional()
  collectorId?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  pppoeUsername?: string;

  @ApiPropertyOptional()
  @IsNumber()
  @IsOptional()
  customPrice?: number;
}
