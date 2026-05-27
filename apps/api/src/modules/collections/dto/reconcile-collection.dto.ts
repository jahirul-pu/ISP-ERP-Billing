import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CollectionStatus } from '@isp-erp/database';

export class ReconcileCollectionDto {
  @ApiProperty({ enum: [CollectionStatus.APPROVED, CollectionStatus.FLAGGED, CollectionStatus.REJECTED], example: 'APPROVED' })
  @IsEnum([CollectionStatus.APPROVED, CollectionStatus.FLAGGED, CollectionStatus.REJECTED])
  @IsNotEmpty()
  status: CollectionStatus;

  @ApiPropertyOptional({ example: 'Verified reference and approved.' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
