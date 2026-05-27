import { IsString, IsNotEmpty, IsOptional, IsNumber, IsUUID, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJournalLineDto {
  @ApiProperty({ description: 'Ledger account UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  accountId: string;

  @ApiPropertyOptional({ example: 1000, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  debit?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  credit?: number;

  @ApiPropertyOptional({ example: 'Custom line remarks' })
  @IsString()
  @IsOptional()
  description?: string;
}
