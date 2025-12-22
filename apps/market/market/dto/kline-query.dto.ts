import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class KlineQueryDto {
  @ApiProperty({
    description: 'Trading symbol (e.g., BTCUSDT)',
    example: 'BTCUSDT',
  })
  @IsString()
  symbol: string;

  @ApiProperty({
    description: 'Kline interval',
    enum: [
      '1s',
      '1m',
      '3m',
      '5m',
      '15m',
      '30m',
      '1h',
      '2h',
      '4h',
      '6h',
      '8h',
      '12h',
      '1d',
      '3d',
      '1w',
      '1M',
    ],
    example: '1h',
  })
  @IsString()
  interval: string;

  @ApiPropertyOptional({
    description: 'Start time (UTC timestamp in milliseconds)',
    example: 1609459200000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  startTime?: number;

  @ApiPropertyOptional({
    description: 'End time (UTC timestamp in milliseconds)',
    example: 1609545600000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  endTime?: number;

  @ApiPropertyOptional({
    description: 'Number of klines to return (default: 500, max: 1000)',
    example: 100,
    default: 500,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(1000)
  limit?: number;

  @ApiPropertyOptional({
    description: 'Response format: binance (original) or custom (default)',
    enum: ['binance', 'custom'],
    default: 'custom',
  })
  @IsOptional()
  @IsString()
  format?: 'binance' | 'custom';
}

