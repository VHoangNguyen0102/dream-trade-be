import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class SentimentDto {
  @ApiProperty({ example: 'Bitcoin price is going to the moon!' })
  @IsString()
  text: string;

  @ApiProperty({ example: 'simple', required: false, enum: ['simple', 'gpt'] })
  @IsOptional()
  @IsString()
  strategy?: string;
}
