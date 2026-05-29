import { IsString, IsNotEmpty, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Working on splicing the fiber now.' })
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiPropertyOptional({ default: false, example: true })
  @IsBoolean()
  @IsOptional()
  isInternal?: boolean;
}
