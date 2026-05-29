import { IsUUID, IsEnum, IsDate, IsOptional, IsString, ValidateNested, IsArray } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordAttendanceDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  employeeId: string;

  @ApiProperty({ example: '2026-05-28T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  date: Date;

  @ApiProperty({ enum: ['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_FIELD'], example: 'PRESENT' })
  @IsEnum(['PRESENT', 'ABSENT', 'LATE', 'HALF_DAY', 'ON_FIELD'])
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'ON_FIELD';

  @ApiPropertyOptional({ example: '2026-05-28T09:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  checkIn?: Date;

  @ApiPropertyOptional({ example: '2026-05-28T18:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  checkOut?: Date;

  @ApiPropertyOptional({ example: 'On-time check-in' })
  @IsString()
  @IsOptional()
  remarks?: string;
}

export class BulkRecordAttendanceDto {
  @ApiProperty({ type: [RecordAttendanceDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RecordAttendanceDto)
  records: RecordAttendanceDto[];
}
