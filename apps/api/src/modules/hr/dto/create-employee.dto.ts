import { IsString, IsNotEmpty, IsOptional, IsEmail, IsNumber, IsEnum, IsUUID, IsDate } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEmployeeDto {
  @ApiProperty({ example: 'Jahirul Islam' })
  @IsString()
  @IsNotEmpty()
  name: string;

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

  @ApiPropertyOptional({ default: 0, example: 25000 })
  @IsNumber()
  @IsOptional()
  baseSalary?: number;

  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'TERMINATED', 'ON_LEAVE'], default: 'ACTIVE' })
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
