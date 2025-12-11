import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { BinanceProvider } from './providers/binance.provider';
import { PriceRepository } from './repositories/price.repository';

@Injectable()
export class MarketService {
  private readonly logger = new Logger(MarketService.name);

  constructor(
    private readonly binanceProvider: BinanceProvider,
    private readonly priceRepository: PriceRepository,
  ) {}

  /**
   * Get current price for a symbol
   */
  async getCurrentPrice(symbol: string) {
    try {
      const price = await this.binanceProvider.getPrice(symbol);
      // Save to database
      await this.priceRepository.create({
        symbol: price.symbol,
        price: price.price,
        timestamp: price.timestamp,
        volume: price.volume,
      });
      return price;
    } catch (error) {
      this.logger.error(`Failed to get price for ${symbol}:`, error.message);
      throw error;
    }
  }

  /**
   * Get current prices for multiple symbols
   */
  async getCurrentPrices(symbols: string[]) {
    try {
      const prices = await this.binanceProvider.getPrices(symbols);
      // Bulk save to database
      await Promise.all(
        prices.map((price) =>
          this.priceRepository.create({
            symbol: price.symbol,
            price: price.price,
            timestamp: price.timestamp,
            volume: price.volume,
          }),
        ),
      );
      return prices;
    } catch (error) {
      this.logger.error('Failed to get prices:', error.message);
      throw error;
    }
  }

  /**
   * Get historical price data
   */
  async getHistory(symbol: string, timeframe: string, limit: number) {
    try {
      // Try to get from cache/database first
      const cachedHistory = await this.priceRepository.findBySymbol(
        symbol,
        limit,
      );

      if (cachedHistory && cachedHistory.length >= limit) {
        return {
          symbol,
          timeframe,
          data: cachedHistory,
          source: 'cache',
        };
      }

      // If not in cache, fetch from provider
      const history = await this.binanceProvider.getHistory(
        symbol,
        timeframe,
      );
      return {
        ...history,
        source: 'live',
      };
    } catch (error) {
      this.logger.error(
        `Failed to get history for ${symbol}:`,
        error.message,
      );
      throw error;
    }
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
