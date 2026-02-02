import {
  Controller,
  Get,
  Query,
  Param,
  ParseIntPipe,
  DefaultValuePipe,
  Optional,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MarketService } from './market.service';
import { Ticker24hrQueryDto } from './dto/ticker-query.dto';

@ApiTags('market')
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('history/:symbol')
  @ApiOperation({ summary: 'Get historical price data (klines)' })
  @ApiQuery({ name: 'timeframe', example: '1h', required: false })
  @ApiQuery({ name: 'limit', example: '100', required: false })
  @ApiQuery({ name: 'startTime', example: '1609459200000', required: false })
  @ApiQuery({ name: 'endTime', example: '1609545600000', required: false })
  @ApiQuery({
    name: 'format',
    enum: ['binance', 'custom'],
    required: false,
    description: 'Response format',
  })
  async getHistory(
    @Param('symbol') symbol: string,
    @Query('timeframe') timeframe?: string,
    @Query('limit', new DefaultValuePipe(100), ParseIntPipe)
    limit: number = 100,
    @Optional() @Query('startTime') startTime?: string,
    @Optional() @Query('endTime') endTime?: string,
    @Query('format') format?: 'binance' | 'custom',
  ) {
    const start = startTime ? Number(startTime) : undefined;
    const end = endTime ? Number(endTime) : undefined;
    return this.marketService.getHistory(
      symbol,
      timeframe || '1h',
      limit,
      start,
      end,
      format || 'custom',
    );
  }

  @Get('ticker/24hr')
  @ApiOperation({ summary: 'Get 24hr ticker price change statistics' })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiQuery({ name: 'symbols', required: false })
  @ApiQuery({ name: 'type', enum: ['FULL', 'MINI'], required: false })
  @ApiQuery({
    name: 'format',
    enum: ['binance', 'custom'],
    required: false,
    description: 'Response format',
  })
  async getTicker24hr(@Query() query: Ticker24hrQueryDto) {
    return this.marketService.getTicker24hr(
      query.symbol,
      query.symbols,
      query.type || 'FULL',
      query.format || 'custom',
    );
  }

}
