import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class StockMovementDto {
  @ApiProperty({ enum: ['STOCK_IN', 'STOCK_OUT', 'ASSIGNED', 'RETURNED', 'DAMAGED', 'REPAIRED'], example: 'STOCK_OUT' })
  @IsEnum(['STOCK_IN', 'STOCK_OUT', 'ASSIGNED', 'RETURNED', 'DAMAGED', 'REPAIRED'])
  type: 'STOCK_IN' | 'STOCK_OUT' | 'ASSIGNED' | 'RETURNED' | 'DAMAGED' | 'REPAIRED';

  @ApiProperty({ default: 1, example: 1 })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'Moving item out for technician testing' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
