import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignAssetDto {
  @ApiProperty({ description: 'Customer UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsNotEmpty()
  customerId: string;

  @ApiPropertyOptional({ example: 'Assigned router for client setup' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
