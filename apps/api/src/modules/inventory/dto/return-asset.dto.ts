import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ReturnAssetDto {
  @ApiProperty({ enum: ['NEW', 'GOOD', 'DAMAGED', 'REPAIR', 'DISPOSED'], example: 'GOOD' })
  @IsEnum(['NEW', 'GOOD', 'DAMAGED', 'REPAIR', 'DISPOSED'])
  condition: 'NEW' | 'GOOD' | 'DAMAGED' | 'REPAIR' | 'DISPOSED';

  @ApiPropertyOptional({ example: 'Returned router from disconnected connection.' })
  @IsString()
  @IsOptional()
  remarks?: string;
}
