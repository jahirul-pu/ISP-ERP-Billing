import { IsString, IsOptional, IsEnum, IsUUID } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTicketDto {
  @ApiPropertyOptional({ example: 'Fiber link down' })
  @IsString()
  @IsOptional()
  subject?: string;

  @ApiPropertyOptional({ example: 'ONU LOS light is blinking red.' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ enum: ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'], example: 'IN_PROGRESS' })
  @IsEnum(['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'])
  @IsOptional()
  status?: 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';

  @ApiPropertyOptional({ enum: ['LOW', 'MEDIUM', 'HIGH', 'URGENT'], example: 'HIGH' })
  @IsEnum(['LOW', 'MEDIUM', 'HIGH', 'URGENT'])
  @IsOptional()
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

  @ApiPropertyOptional({ enum: ['TECHNICAL', 'BILLING', 'SERVICE_REQUEST'], example: 'TECHNICAL' })
  @IsEnum(['TECHNICAL', 'BILLING', 'SERVICE_REQUEST'])
  @IsOptional()
  type?: 'TECHNICAL' | 'BILLING' | 'SERVICE_REQUEST';

  @ApiPropertyOptional({ description: 'Assigned User UUID', example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsUUID()
  @IsOptional()
  assignedToId?: string;

  @ApiPropertyOptional({ example: 'Cleaned the fiber joint and spliced it again. Signal restored.' })
  @IsString()
  @IsOptional()
  resolution?: string;
}
