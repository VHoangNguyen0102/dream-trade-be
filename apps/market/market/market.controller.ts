import { Controller, Get, Query, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { MarketService } from './market.service';

@ApiTags('market')
@Controller('market')
export class MarketController {
  constructor(private readonly marketService: MarketService) {}

  @Get('price/:symbol')
  @ApiOperation({ summary: 'Get current price for a symbol' })
  async getPrice(@Param('symbol') symbol: string) {
    return this.marketService.getCurrentPrice(symbol);
  }

  @Get('prices')
  @ApiOperation({ summary: 'Get current prices for multiple symbols' })
  @ApiQuery({ name: 'symbols', example: 'BTC,ETH,BNB' })
  async getPrices(@Query('symbols') symbols: string) {
    const symbolArray = symbols.split(',');
    return this.marketService.getCurrentPrices(symbolArray);
  }

  @Get('history/:symbol')
  @ApiOperation({ summary: 'Get historical price data' })
  @ApiQuery({ name: 'timeframe', example: '1h', required: false })
  @ApiQuery({ name: 'limit', example: '100', required: false })
  async getHistory(
    @Param('symbol') symbol: string,
    @Query('timeframe') timeframe?: string,
    @Query('limit') limit?: number,
  ) {
    return this.marketService.getHistory(
      symbol,
      timeframe || '1h',
      limit || 100,
    );
  }
}
