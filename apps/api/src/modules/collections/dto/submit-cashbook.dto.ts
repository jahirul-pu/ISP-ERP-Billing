import { IsString, IsNotEmpty, IsOptional, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SubmitCashbookDto {
  @ApiProperty({ description: 'The cash amount submitted by the collector', example: 5400 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  submittedAmount: number;

  @ApiPropertyOptional({ example: 'Submitted cash after sector 1 collections' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
