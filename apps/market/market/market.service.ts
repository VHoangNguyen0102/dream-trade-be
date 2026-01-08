import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceProvider } from './providers/binance.provider';
import { PriceRepository } from './repositories/price.repository';
import { CacheService } from './services/cache.service';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  // Cache TTL in seconds
  private readonly CACHE_TTL_TICKER = 5;
  private readonly CACHE_TTL_KLINES = 5;

  constructor(
    private readonly binanceProvider: BinanceProvider,
    private readonly priceRepository: PriceRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get historical price data
   */
  async getHistory(
    symbol: string,
    timeframe: string,
    limit: number,
    startTime?: number,
    endTime?: number,
    format: 'binance' | 'custom' = 'custom',
  ) {
    try {
      const cacheKey = `klines:${symbol.toUpperCase()}:${timeframe}:${limit}:${startTime || ''}:${endTime || ''}`;
      
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return this.formatResponse(cached, format, 'klines');
      }

      // Fetch from provider
      const history = await this.binanceProvider.getKlines(
        symbol,
        timeframe,
        startTime,
        endTime,
        limit,
      );
      
      const result = {
        symbol,
        timeframe,
        data: history,
        source: 'live',
      };
      
      // Cache the result
      await this.cacheService.set(cacheKey, result, this.CACHE_TTL_KLINES);
      
      return this.formatResponse(result, format, 'klines');
    } catch (error: any) {
      this.logger.error(
        `Failed to get history for ${symbol}:`,
        error.message,
      );
      
      // Try cached data as fallback
      const cacheKey = `klines:${symbol.toUpperCase()}:${timeframe}:${limit}:${startTime || ''}:${endTime || ''}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.warn(`Returning cached klines for ${symbol} due to error`);
        return this.formatResponse(cached, format, 'klines');
      }
      
      throw error;
    }
  }

  /**
   * Get 24hr ticker statistics
   */
  async getTicker24hr(
    symbol?: string,
    symbols?: string,
    type: 'FULL' | 'MINI' = 'FULL',
    format: 'binance' | 'custom' = 'custom',
  ) {
    try {
      const symbolsKey = symbol || symbols || 'all';
      const cacheKey = `ticker24hr:${symbolsKey}:${type}`;
      
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return this.formatResponse(cached, format, 'ticker24hr');
      }

      const symbolsArray = symbols
        ? symbols.split(',').map((s) => s.trim())
        : undefined;

      const data = await this.binanceProvider.getTicker24hr(
        symbol,
        symbolsArray,
        type,
      );
      
      // Cache the result
      await this.cacheService.set(cacheKey, data, this.CACHE_TTL_TICKER);
      
      return this.formatResponse(data, format, 'ticker24hr');
    } catch (error: any) {
      this.logger.error('Failed to get 24hr ticker:', error.message);
      
      // Try cached data as fallback
      const symbolsKey = symbol || symbols || 'all';
      const cacheKey = `ticker24hr:${symbolsKey}:${type}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.warn(`Returning cached 24hr ticker due to error`);
        return this.formatResponse(cached, format, 'ticker24hr');
      }
      
      throw error;
    }
  }

  /**
   * Format response based on format parameter
   */
  private formatResponse(
    data: any,
    format: 'binance' | 'custom',
    type: string,
  ): any {
    if (format === 'binance') {
      return data; // Return as-is from Binance
    }

    // Custom format - can be enhanced later
    return data;
  }

  /**
   * Scheduled job: Fetch prices every minute
   * Note: This cron job is kept for background price fetching to DB
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handlePriceFetchCron() {
    this.logger.debug('Cron job running - currently disabled');
    // Disabled for now as we're using direct WebSocket connections
    // Can be re-enabled if needed for historical data collection
  }
}
