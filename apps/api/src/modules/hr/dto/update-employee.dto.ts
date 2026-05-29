import { IsString, IsOptional, IsEmail, IsNumber, IsEnum, IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateEmployeeDto {
  @ApiPropertyOptional({ example: 'Jahirul Islam' })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ example: '01711223344' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: 'jahirul@isp-erp.local' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: 'Support & Operations' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiPropertyOptional({ example: 'Senior Technician' })
  @IsString()
  @IsOptional()
  designation?: string;

  @ApiPropertyOptional({ example: 28000 })
  @IsNumber()
  @IsOptional()
  baseSalary?: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'] })
  @IsEnum(['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'])
  @IsOptional()
  status?: 'ACTIVE' | 'INACTIVE' | 'TERMINATED' | 'ON_LEAVE';

  @ApiPropertyOptional({ example: '2026-05-28T00:00:00.000Z' })
  @Type(() => Date)
  @IsDate()
  @IsOptional()
  joinDate?: Date;

  @ApiPropertyOptional({ description: 'Link to a login User account', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  userId?: string;
}
