import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional } from 'class-validator';

export class CausalMatchDto {
  @ApiProperty({ type: 'array' })
  @IsArray()
  newsArticles: any[];

  @ApiProperty({ type: 'array' })
  @IsArray()
  priceData: any[];

  @ApiProperty({ example: 60, required: false })
  @IsOptional()
  @IsNumber()
  timeWindowMinutes?: number;
}
