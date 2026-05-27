import { IsString, IsNotEmpty, IsOptional, IsDate, ValidateNested, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreateJournalLineDto } from './create-journal-line.dto';

export class CreateJournalDto {
  @ApiProperty({ example: 'Manual adjustments for office cash transfer to bank' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ example: 'TX-10012' })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ example: 'transfer' })
  @IsString()
  @IsOptional()
  referenceType?: string;

  @ApiPropertyOptional({ example: '2026-05-27T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  date?: Date;

  @ApiProperty({ type: [CreateJournalLineDto] })
  @ValidateNested({ each: true })
  @Type(() => CreateJournalLineDto)
  @ArrayMinSize(2, { message: 'Journal entry must have at least 2 lines (debit & credit)' })
  lines: CreateJournalLineDto[];
}
