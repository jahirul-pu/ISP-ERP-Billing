import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectionStatus } from '@isp-erp/database';

export class ReconcileCashbookDto {
  @ApiProperty({ enum: [CollectionStatus.APPROVED, CollectionStatus.FLAGGED, CollectionStatus.REJECTED], example: 'APPROVED' })
  @IsEnum([CollectionStatus.APPROVED, CollectionStatus.FLAGGED, CollectionStatus.REJECTED])
  @IsNotEmpty()
  status: CollectionStatus;

  @ApiProperty({ description: 'The actual physical cash received and verified by admin', example: 5400 })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  actualAmount: number;

  @ApiPropertyOptional({ example: 'Verified cash matched amount. Approved.' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
