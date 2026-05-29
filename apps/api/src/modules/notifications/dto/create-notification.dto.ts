import { IsString, IsNotEmpty, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateNotificationDto {
  @ApiPropertyOptional({ description: 'Optional customer recipient UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  recipientId?: string;

  @ApiPropertyOptional({ description: 'Optional loose recipient address/phone', example: '+8801700000000' })
  @IsString()
  @IsOptional()
  recipient?: string;

  @ApiProperty({ enum: ['SMS', 'WHATSAPP', 'EMAIL'], example: 'SMS' })
  @IsEnum(['SMS', 'WHATSAPP', 'EMAIL'])
  channel: 'SMS' | 'WHATSAPP' | 'EMAIL';

  @ApiPropertyOptional({ enum: ['DUE_REMINDER', 'PAYMENT_CONFIRMATION', 'OVERDUE_WARNING', 'COMPLAINT_UPDATE', 'SALARY_NOTIFICATION', 'CUSTOM'], default: 'CUSTOM' })
  @IsEnum(['DUE_REMINDER', 'PAYMENT_CONFIRMATION', 'OVERDUE_WARNING', 'COMPLAINT_UPDATE', 'SALARY_NOTIFICATION', 'CUSTOM'])
  @IsOptional()
  type?: 'DUE_REMINDER' | 'PAYMENT_CONFIRMATION' | 'OVERDUE_WARNING' | 'COMPLAINT_UPDATE' | 'SALARY_NOTIFICATION' | 'CUSTOM';

  @ApiPropertyOptional({ example: 'Urgent: Internet Bill Overdue' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiProperty({ example: 'Dear Customer, your bill for May 2026 is due. Please pay.' })
  @IsString()
  @IsNotEmpty()
  message: string;
}
