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
import { KlineQueryDto } from './dto/kline-query.dto';
import {
  Ticker24hrQueryDto,
  TickerPriceQueryDto,
  BookTickerQueryDto,
} from './dto/ticker-query.dto';
import { ExchangeInfoQueryDto } from './dto/exchange-info.dto';

@ApiTags('market')
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('price/:symbol')
  @ApiOperation({ summary: 'Get current price for a symbol' })
  @ApiQuery({
    name: 'format',
    enum: ['binance', 'custom'],
    required: false,
    description: 'Response format',
  })
  async getPrice(
    @Param('symbol') symbol: string,
    @Query('format') format?: 'binance' | 'custom',
  ) {
    return this.marketService.getCurrentPrice(
      symbol,
      format || 'custom',
    );
  }

  @Get('prices')
  @ApiOperation({ summary: 'Get current prices for multiple symbols' })
  @ApiQuery({ name: 'symbols', example: 'BTCUSDT,ETHUSDT,BNBUSDT' })
  @ApiQuery({
    name: 'format',
    enum: ['binance', 'custom'],
    required: false,
    description: 'Response format',
  })
  async getPrices(
    @Query('symbols') symbols: string,
    @Query('format') format?: 'binance' | 'custom',
  ) {
    const symbolArray = symbols.split(',').map((s) => s.trim());
    return this.marketService.getCurrentPrices(symbolArray, format || 'custom');
  }

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

  @Get('exchange-info')
  @ApiOperation({
    summary: 'Get exchange information (trading pairs, symbols)',
  })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiQuery({ name: 'symbols', required: false })
  @ApiQuery({
    name: 'format',
    enum: ['binance', 'custom'],
    required: false,
    description: 'Response format',
  })
  async getExchangeInfo(@Query() query: ExchangeInfoQueryDto) {
    return this.marketService.getExchangeInfo(
      query.symbol,
      query.symbols,
      query.format || 'custom',
    );
  }

  @Get('avg-price/:symbol')
  @ApiOperation({ summary: 'Get average price for a symbol' })
  @ApiQuery({
    name: 'format',
    enum: ['binance', 'custom'],
    required: false,
    description: 'Response format',
  })
  async getAvgPrice(
    @Param('symbol') symbol: string,
    @Query('format') format?: 'binance' | 'custom',
  ) {
    return this.marketService.getAvgPrice(symbol, format || 'custom');
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

  @Get('ticker/price')
  @ApiOperation({ summary: 'Get latest price for symbol(s)' })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiQuery({ name: 'symbols', required: false })
  @ApiQuery({
    name: 'format',
    enum: ['binance', 'custom'],
    required: false,
    description: 'Response format',
  })
  async getTickerPrice(@Query() query: TickerPriceQueryDto) {
    return this.marketService.getTickerPrice(
      query.symbol,
      query.symbols,
      query.format || 'custom',
    );
  }

  @Get('ticker/book-ticker')
  @ApiOperation({ summary: 'Get best bid/ask price (order book ticker)' })
  @ApiQuery({ name: 'symbol', required: false })
  @ApiQuery({ name: 'symbols', required: false })
  @ApiQuery({
    name: 'format',
    enum: ['binance', 'custom'],
    required: false,
    description: 'Response format',
  })
  async getBookTicker(@Query() query: BookTickerQueryDto) {
    return this.marketService.getBookTicker(
      query.symbol,
      query.symbols,
      query.format || 'custom',
    );
  }

  @Get('ui-klines')
  @ApiOperation({ summary: 'Get UI-optimized klines/candlestick data' })
  @ApiQuery({ name: 'symbol', required: true })
  @ApiQuery({ name: 'interval', required: true })
  @ApiQuery({ name: 'startTime', required: false })
  @ApiQuery({ name: 'endTime', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({
    name: 'format',
    enum: ['binance', 'custom'],
    required: false,
    description: 'Response format',
  })
  async getUIKlines(
    @Query('symbol') symbol: string,
    @Query('interval') interval: string,
    @Optional() @Query('startTime') startTime?: string,
    @Optional() @Query('endTime') endTime?: string,
    @Query('limit', new DefaultValuePipe(500), ParseIntPipe)
    limit: number = 500,
    @Query('format') format?: 'binance' | 'custom',
  ) {
    const start = startTime ? Number(startTime) : undefined;
    const end = endTime ? Number(endTime) : undefined;
    return this.marketService.getUIKlines(
      symbol,
      interval,
      start,
      end,
      limit,
      format || 'custom',
    );
  }

}
