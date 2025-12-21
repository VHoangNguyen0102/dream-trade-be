import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceProvider } from './providers/binance.provider';
import { PriceRepository } from './repositories/price.repository';
import { CacheService } from './services/cache.service';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  // Cache TTL in seconds
  private readonly CACHE_TTL_PRICE = 5;
  private readonly CACHE_TTL_TICKER = 5;
  private readonly CACHE_TTL_EXCHANGE_INFO = 60;
  private readonly CACHE_TTL_KLINES = 5;

  constructor(
    private readonly binanceProvider: BinanceProvider,
    private readonly priceRepository: PriceRepository,
    private readonly cacheService: CacheService,
  ) {}

  /**
   * Get current price for a symbol
   */
  async getCurrentPrice(symbol: string, format: 'binance' | 'custom' = 'custom') {
    try {
      const cacheKey = `price:${symbol.toUpperCase()}`;
      
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return this.formatResponse(cached, format, 'price');
      }

      const price = await this.binanceProvider.getPrice(symbol);
      
      // Save to cache
      await this.cacheService.set(cacheKey, price, this.CACHE_TTL_PRICE);
      
      // Save to database (async, don't wait)
      this.priceRepository.create({
        symbol: price.symbol,
        price: price.price,
        timestamp: price.timestamp,
        volume: price.volume,
      }).catch((err) => this.logger.warn(`Failed to save price to DB: ${err.message}`));
      
      return this.formatResponse(price, format, 'price');
    } catch (error: any) {
      this.logger.error(`Failed to get price for ${symbol}:`, error.message);
      
      // Try to return cached data as fallback
      const cacheKey = `price:${symbol.toUpperCase()}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.warn(`Returning cached price for ${symbol} due to error`);
        return this.formatResponse(cached, format, 'price');
      }
      
      throw error;
    }
  }

  /**
   * Get current prices for multiple symbols
   */
  async getCurrentPrices(symbols: string[], format: 'binance' | 'custom' = 'custom') {
    try {
      const cacheKeys = symbols.map((s) => `price:${s.toUpperCase()}`);
      const cachedPrices = await this.cacheService.mget(cacheKeys);
      
      // Check which symbols need to be fetched
      const symbolsToFetch: string[] = [];
      const results: any[] = [];
      
      cachedPrices.forEach((cached, index) => {
        if (cached) {
          results[index] = this.formatResponse(cached, format, 'price');
        } else {
          symbolsToFetch.push(symbols[index]);
        }
      });

      // Fetch missing symbols
      if (symbolsToFetch.length > 0) {
        const fetchedPrices = await this.binanceProvider.getPrices(symbolsToFetch);
        
        // Cache and save to DB
        const cacheData = fetchedPrices.map((price) => ({
          key: `price:${price.symbol}`,
          value: price,
          ttl: this.CACHE_TTL_PRICE,
        }));
        await this.cacheService.mset(cacheData);
        
        // Save to DB (async)
        fetchedPrices.forEach((price) => {
          this.priceRepository.create({
            symbol: price.symbol,
            price: price.price,
            timestamp: price.timestamp,
            volume: price.volume,
          }).catch((err) => this.logger.warn(`Failed to save price to DB: ${err.message}`));
        });

        // Merge results
        let fetchedIndex = 0;
        results.forEach((result, index) => {
          if (!result) {
            results[index] = this.formatResponse(fetchedPrices[fetchedIndex++], format, 'price');
          }
        });
      }

      return results;
    } catch (error: any) {
      this.logger.error('Failed to get prices:', error.message);
      throw error;
    }
  }

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
   * Get exchange information
   */
  async getExchangeInfo(
    symbol?: string,
    symbols?: string,
    format: 'binance' | 'custom' = 'custom',
  ) {
    try {
      const cacheKey = `exchangeInfo:${symbol || symbols || 'all'}`;
      
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return this.formatResponse(cached, format, 'exchangeInfo');
      }

      const symbolsArray = symbols
        ? symbols.split(',').map((s) => s.trim())
        : undefined;

      const data = await this.binanceProvider.getExchangeInfo(
        symbol,
        symbolsArray,
      );
      
      // Cache the result
      await this.cacheService.set(cacheKey, data, this.CACHE_TTL_EXCHANGE_INFO);
      
      return this.formatResponse(data, format, 'exchangeInfo');
    } catch (error: any) {
      this.logger.error('Failed to get exchange info:', error.message);
      throw error;
    }
  }

  /**
   * Get average price
   */
  async getAvgPrice(symbol: string, format: 'binance' | 'custom' = 'custom') {
    try {
      const cacheKey = `avgPrice:${symbol.toUpperCase()}`;
      
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return this.formatResponse(cached, format, 'avgPrice');
      }

      const data = await this.binanceProvider.getAvgPrice(symbol);
      
      // Cache the result
      await this.cacheService.set(cacheKey, data, this.CACHE_TTL_PRICE);
      
      return this.formatResponse(data, format, 'avgPrice');
    } catch (error: any) {
      this.logger.error(`Failed to get avg price for ${symbol}:`, error.message);
      
      // Try cached data as fallback
      const cacheKey = `avgPrice:${symbol.toUpperCase()}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.warn(`Returning cached avg price for ${symbol} due to error`);
        return this.formatResponse(cached, format, 'avgPrice');
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
   * Get ticker price
   */
  async getTickerPrice(
    symbol?: string,
    symbols?: string,
    format: 'binance' | 'custom' = 'custom',
  ) {
    try {
      const symbolsKey = symbol || symbols || 'all';
      const cacheKey = `tickerPrice:${symbolsKey}`;
      
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return this.formatResponse(cached, format, 'tickerPrice');
      }

      const symbolsArray = symbols
        ? symbols.split(',').map((s) => s.trim())
        : undefined;

      const data = await this.binanceProvider.getTickerPrice(
        symbol,
        symbolsArray,
      );
      
      // Cache the result
      await this.cacheService.set(cacheKey, data, this.CACHE_TTL_PRICE);
      
      return this.formatResponse(data, format, 'tickerPrice');
    } catch (error: any) {
      this.logger.error('Failed to get ticker price:', error.message);
      
      // Try cached data as fallback
      const symbolsKey = symbol || symbols || 'all';
      const cacheKey = `tickerPrice:${symbolsKey}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.warn(`Returning cached ticker price due to error`);
        return this.formatResponse(cached, format, 'tickerPrice');
      }
      
      throw error;
    }
  }

  /**
   * Get book ticker (best bid/ask)
   */
  async getBookTicker(
    symbol?: string,
    symbols?: string,
    format: 'binance' | 'custom' = 'custom',
  ) {
    try {
      const symbolsKey = symbol || symbols || 'all';
      const cacheKey = `bookTicker:${symbolsKey}`;
      
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return this.formatResponse(cached, format, 'bookTicker');
      }

      const symbolsArray = symbols
        ? symbols.split(',').map((s) => s.trim())
        : undefined;

      const data = await this.binanceProvider.getBookTicker(
        symbol,
        symbolsArray,
      );
      
      // Cache the result
      await this.cacheService.set(cacheKey, data, this.CACHE_TTL_TICKER);
      
      return this.formatResponse(data, format, 'bookTicker');
    } catch (error: any) {
      this.logger.error('Failed to get book ticker:', error.message);
      
      // Try cached data as fallback
      const symbolsKey = symbol || symbols || 'all';
      const cacheKey = `bookTicker:${symbolsKey}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.warn(`Returning cached book ticker due to error`);
        return this.formatResponse(cached, format, 'bookTicker');
      }
      
      throw error;
    }
  }

  /**
   * Get UI-optimized klines
   */
  async getUIKlines(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
    format: 'binance' | 'custom' = 'custom',
  ) {
    try {
      const cacheKey = `uiKlines:${symbol.toUpperCase()}:${interval}:${limit || 500}:${startTime || ''}:${endTime || ''}`;
      
      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return this.formatResponse(cached, format, 'uiKlines');
      }

      const data = await this.binanceProvider.getUIKlines(
        symbol,
        interval,
        startTime,
        endTime,
        limit,
      );
      
      // Cache the result
      await this.cacheService.set(cacheKey, data, this.CACHE_TTL_KLINES);
      
      return this.formatResponse(data, format, 'uiKlines');
    } catch (error: any) {
      this.logger.error(`Failed to get UI klines for ${symbol}:`, error.message);
      
      // Try cached data as fallback
      const cacheKey = `uiKlines:${symbol.toUpperCase()}:${interval}:${limit || 500}:${startTime || ''}:${endTime || ''}`;
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        this.logger.warn(`Returning cached UI klines for ${symbol} due to error`);
        return this.formatResponse(cached, format, 'uiKlines');
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
   * GIAI ĐOẠN 2 - TUẦN 4
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handlePriceFetchCron() {
    this.logger.debug('Fetching prices from Binance...');
    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT']; // Can be configured
    try {
      await this.getCurrentPrices(symbols);
      this.logger.debug('Prices fetched and saved successfully');
    } catch (error) {
      this.logger.error('Price fetch cron failed:', error.message);
    }
  }
}
