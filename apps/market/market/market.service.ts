import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceProvider } from './providers/binance.provider';
import { PriceRepository } from './repositories/price.repository';
import { CacheService } from './services/cache.service';

@Injectable()
export class MarketService implements OnModuleInit {
  private readonly logger = new Logger(MarketService.name);

  // Cache TTL in seconds
  private readonly CACHE_TTL_TICKER = 5;
  private readonly CACHE_TTL_KLINES = 5;
  private availableSymbols: string[] = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'];
  private lastSymbolUpdate = 0;

  constructor(
    private readonly binanceProvider: BinanceProvider,
    private readonly priceRepository: PriceRepository,
    private readonly cacheService: CacheService,
  ) { }

  async onModuleInit() {
    this.logger.log('MarketService initialized. Setting up Redis listeners...');

    // Subscribe to data requests from other services (e.g., AI Analysis)
    await this.cacheService.subscribe('market:request:history', async (message) => {
      try {
        const request = JSON.parse(message);
        const { symbol, timeframe = '1h', limit = 168 } = request;

        if (symbol) {
          this.logger.log(`Received data request for ${symbol} via Redis`);
          // Trigger history update in background
          this.getHistory(symbol, timeframe, limit).catch(err =>
            this.logger.error(`Error processing Redis request for ${symbol}:`, err)
          );
        }
      } catch (error) {
        this.logger.error('Failed to parse market request message:', message);
      }
    });

    // Run initial history update on startup
    setTimeout(() => {
      this.handleHistoryUpdateCron();
    }, 5000);
  }

  /**
   * Fetch all active USDT trading pairs from Binance
   */
  private async updateAvailableSymbols() {
    const now = Date.now();
    // Update every 1 hour
    if (this.availableSymbols.length > 3 && now - this.lastSymbolUpdate < 3600000) {
      return;
    }

    try {
      this.logger.log('Updating available symbols from Binance...');
      const exchangeInfo = await this.binanceProvider.getExchangeInfo();
      const usdtPairs = exchangeInfo.symbols
        .filter((s: any) => s.status === 'TRADING' && s.quoteAsset === 'USDT')
        .map((s: any) => s.symbol);

      if (usdtPairs.length > 0) {
        this.availableSymbols = usdtPairs;
        this.lastSymbolUpdate = now;
        this.logger.log(`Discovered ${usdtPairs.length} active USDT pairs.`);
      }
    } catch (error) {
      this.logger.error('Failed to update available symbols:', error.message);
    }
  }

  /**
   * Normalize symbol for Redis keys (e.g., BTCUSDT -> BTC)
   */
  private normalizeSymbol(symbol: string): string {
    const s = symbol.toUpperCase();
    if (s.endsWith('USDT')) {
      return s.slice(0, -4);
    }
    return s;
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
      // Normalize symbol for Binance (must end with USDT for most pairs, unless it is a cross pair)
      let binanceSymbol = symbol.toUpperCase();
      if (!binanceSymbol.endsWith('USDT') && !binanceSymbol.includes('BTC') && !binanceSymbol.includes('ETH')) {
        binanceSymbol = `${binanceSymbol}USDT`;
      } else if (!binanceSymbol.endsWith('USDT') && ['BTC', 'ETH', 'BNB', 'SOL', 'XRP', 'ADA', 'DOGE'].includes(binanceSymbol)) {
        binanceSymbol = `${binanceSymbol}USDT`;
      }

      const cacheKey = `klines:${binanceSymbol}:${timeframe}:${limit}:${startTime || ''}:${endTime || ''}`;

      // Try cache first
      const cached = await this.cacheService.get(cacheKey);
      if (cached) {
        return this.formatResponse(cached, format, 'klines');
      }

      // Fetch from provider
      const history = await this.binanceProvider.getKlines(
        binanceSymbol,
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

      // Also publish to Redis for AI services
      if (history && history.length > 0) {
        const normalized = this.normalizeSymbol(symbol);

        for (const candle of history) {
          const timestamp = candle[0]; // Unix ms
          const priceData = {
            symbol: normalized,
            price: parseFloat(candle[4]), // Close price
            timestamp: new Date(timestamp).toISOString(),
            volume: parseFloat(candle[5]),
          };

          // Push to sorted set (unique by content, ordered by score)
          // Use timestamp as score for sorted set
          await this.cacheService.addToSortedSet(
            `market:price:${normalized}:history`,
            timestamp,
            priceData,
          );
        }
        // Keep last 1000 items
        await this.cacheService.trimSortedSet(`market:price:${normalized}:history`, 1000);

        // Publish latest price as real-time update
        const latestPrice = history[history.length - 1];
        const latestPriceData = {
          symbol: normalized,
          price: parseFloat(latestPrice[4]),
          timestamp: new Date(latestPrice[0]).toISOString(),
          volume: parseFloat(latestPrice[5]),
        };
        await this.cacheService.publish(`market:price:${normalized}`, latestPriceData);
      }

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
    await this.updateAvailableSymbols();

    this.logger.log(`Executing price fetch cron job for ${this.availableSymbols.length} symbols...`);

    // Fetch all 24hr tickers in one call to be efficient (Rate limit friendly)
    try {
      const tickers = await this.binanceProvider.getTicker24hr();
      const tickerMap = new Map(tickers.map((t: any) => [t.symbol, t]));

      for (const symbol of this.availableSymbols) {
        const ticker = tickerMap.get(symbol) as any;
        if (ticker) {
          const normalized = this.normalizeSymbol(symbol);
          const priceData = {
            symbol: normalized,
            price: parseFloat(ticker.lastPrice),
            timestamp: new Date(ticker.closeTime).toISOString(),
            volume: parseFloat(ticker.volume),
          };

          // Update real-time price in Redis
          await this.cacheService.publish(`market:price:${normalized}`, priceData);
        }
      }
      this.logger.log(`Successfully updated real-time prices for ${this.availableSymbols.length} symbols.`);
    } catch (error) {
      this.logger.error('Failed to fetch batch tickers in cron:', error.message);
    }
  }

  /**
   * Scheduled job: Update history every hour
   * Ensures Redis has fresh data for AI models
   */
  @Cron(CronExpression.EVERY_HOUR)
  async handleHistoryUpdateCron() {
    this.logger.log('Executing history update cron job...');
    const importantSymbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT'];

    for (const symbol of importantSymbols) {
      try {
        // Fetch last 168 hours (1 week) of 1h data
        await this.getHistory(symbol, '1h', 168);
        // Small delay to be nice to API
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        this.logger.warn(`Failed to auto-update history for ${symbol}: ${error.message}`);
      }
    }
    this.logger.log('History update cron job completed.');
  }
}
