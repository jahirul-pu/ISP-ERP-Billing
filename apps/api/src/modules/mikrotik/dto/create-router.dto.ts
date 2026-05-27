import { IsString, IsNotEmpty, IsOptional, IsNumber, IsBoolean, IsUUID, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRouterDto {
  @ApiProperty({ example: 'Core Router 01' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '192.168.88.1' })
  @IsString()
  @IsNotEmpty()
  host: string;

  @ApiPropertyOptional({ default: 8728 })
  @IsNumber()
  @IsOptional()
  port?: number;

  @ApiProperty({ example: 'admin' })
  @IsString()
  @IsNotEmpty()
  username: string;

  @ApiProperty({ example: 'router_password' })
  @IsString()
  @IsNotEmpty()
  password?: string;

  @ApiPropertyOptional({ default: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'POP ID' })
  @IsUUID()
  @IsOptional()
  popId?: string;

  @ApiPropertyOptional({ enum: ['MANUAL', 'HOURLY', 'DAILY'], default: 'MANUAL' })
  @IsEnum(['MANUAL', 'HOURLY', 'DAILY'])
  @IsOptional()
  syncFrequency?: 'MANUAL' | 'HOURLY' | 'DAILY';
}
