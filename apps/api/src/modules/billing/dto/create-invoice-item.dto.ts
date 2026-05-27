import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BillComponentType } from '@isp-erp/database';

export class CreateInvoiceItemDto {
  @ApiProperty({ enum: BillComponentType, example: 'INTERNET_PACKAGE' })
  @IsEnum(BillComponentType)
  @IsNotEmpty()
  type: BillComponentType;

  @ApiProperty({ example: 'Internet Bandwidth - 20 Mbps' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsInt()
  @Min(1)
  @IsOptional()
  quantity?: number;
}
