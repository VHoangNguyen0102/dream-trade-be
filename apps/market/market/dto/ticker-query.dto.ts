import { IsString, IsOptional, IsArray, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class Ticker24hrQueryDto {
  @ApiPropertyOptional({
    description: 'Single trading symbol (e.g., BTCUSDT)',
    example: 'BTCUSDT',
  })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({
    description: 'Multiple trading symbols (comma-separated)',
    example: 'BTCUSDT,ETHUSDT,BNBUSDT',
  })
  @IsOptional()
  @IsString()
  symbols?: string;

  @ApiPropertyOptional({
    description: 'Ticker type',
    enum: ['FULL', 'MINI'],
    default: 'FULL',
  })
  @IsOptional()
  @IsEnum(['FULL', 'MINI'])
  type?: 'FULL' | 'MINI';

  @ApiPropertyOptional({
    description: 'Response format: binance (original) or custom (default)',
    enum: ['binance', 'custom'],
    default: 'custom',
  })
  @IsOptional()
  @IsString()
  format?: 'binance' | 'custom';
}

export class TickerPriceQueryDto {
  @ApiPropertyOptional({
    description: 'Single trading symbol (e.g., BTCUSDT)',
    example: 'BTCUSDT',
  })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({
    description: 'Multiple trading symbols (comma-separated)',
    example: 'BTCUSDT,ETHUSDT,BNBUSDT',
  })
  @IsOptional()
  @IsString()
  symbols?: string;

  @ApiPropertyOptional({
    description: 'Response format: binance (original) or custom (default)',
    enum: ['binance', 'custom'],
    default: 'custom',
  })
  @IsOptional()
  @IsString()
  format?: 'binance' | 'custom';
}

export class BookTickerQueryDto {
  @ApiPropertyOptional({
    description: 'Single trading symbol (e.g., BTCUSDT)',
    example: 'BTCUSDT',
  })
  @IsOptional()
  @IsString()
  symbol?: string;

  @ApiPropertyOptional({
    description: 'Multiple trading symbols (comma-separated)',
    example: 'BTCUSDT,ETHUSDT,BNBUSDT',
  })
  @IsOptional()
  @IsString()
  symbols?: string;

  @ApiPropertyOptional({
    description: 'Response format: binance (original) or custom (default)',
    enum: ['binance', 'custom'],
    default: 'custom',
  })
  @IsOptional()
  @IsString()
  format?: 'binance' | 'custom';
}

