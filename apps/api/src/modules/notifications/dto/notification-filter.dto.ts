import { IsOptional, IsString, IsInt, Min, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationFilterDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  limit?: number;

  @ApiPropertyOptional({ description: 'Search matches recipient name, email, phone, or message body' })
  @IsString()
  @IsOptional()
  search?: string;

  @ApiPropertyOptional({ enum: ['SMS', 'WHATSAPP', 'EMAIL'] })
  @IsEnum(['SMS', 'WHATSAPP', 'EMAIL'])
  @IsOptional()
  channel?: 'SMS' | 'WHATSAPP' | 'EMAIL';

  @ApiPropertyOptional({ enum: ['PENDING', 'SENT', 'FAILED'] })
  @IsString()
  @IsOptional()
  status?: string;

  @ApiPropertyOptional({ enum: ['DUE_REMINDER', 'PAYMENT_CONFIRMATION', 'OVERDUE_WARNING', 'COMPLAINT_UPDATE', 'SALARY_NOTIFICATION', 'CUSTOM'] })
  @IsEnum(['DUE_REMINDER', 'PAYMENT_CONFIRMATION', 'OVERDUE_WARNING', 'COMPLAINT_UPDATE', 'SALARY_NOTIFICATION', 'CUSTOM'])
  @IsOptional()
  type?: 'DUE_REMINDER' | 'PAYMENT_CONFIRMATION' | 'OVERDUE_WARNING' | 'COMPLAINT_UPDATE' | 'SALARY_NOTIFICATION' | 'CUSTOM';
}
