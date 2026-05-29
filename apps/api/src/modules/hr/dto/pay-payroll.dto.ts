import { IsUUID, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PayPayrollDto {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000', description: 'Asset Account ID (Cash or Bank)' })
  @IsUUID()
  paidFromAccountId: string;

  @ApiPropertyOptional({ example: 'Salary paid via Bank transfer' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
