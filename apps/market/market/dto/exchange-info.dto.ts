import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ExchangeInfoQueryDto {
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

