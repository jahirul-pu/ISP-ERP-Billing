import { IsString, IsNotEmpty, IsOptional, IsEnum, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class BulkCampaignDto {
  @ApiProperty({ enum: ['SMS', 'WHATSAPP', 'EMAIL'], example: 'SMS' })
  @IsEnum(['SMS', 'WHATSAPP', 'EMAIL'])
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';

  @ApiPropertyOptional({ example: 'Broadband Maintenance Outage Alert' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: 'Dear Client, there will be a scheduled fiber maintenance in your area tomorrow...' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({ enum: ['ALL', 'AREA', 'PACKAGE', 'STATUS'], example: 'AREA' })
  @IsIn(['ALL', 'AREA', 'PACKAGE', 'STATUS'])
  targetType: 'ALL' | 'AREA' | 'PACKAGE' | 'STATUS';

  @ApiPropertyOptional({ description: 'Target identifier: Area ID, Package ID, or CustomerStatus string value', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsString()
  @IsOptional()
  targetValue?: string;
}
