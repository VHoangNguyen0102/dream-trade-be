import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  IMarketProvider,
  IMarketPrice,
  IMarketHistory,
  ICandle,
} from '@shared/interfaces/market-provider.interface';

/**
 * ADAPTER PATTERN: Binance Provider
 * Minh's implementation - Week 2
 * 
 * This adapter allows the system to work with Binance API
 * Later can easily add OKXProvider, CoinbaseProvider without changing core logic
 */
@Injectable()
export class BinanceProvider implements IMarketProvider {
  private readonly logger = new Logger(BinanceProvider.name);
  private readonly baseUrl = 'https://api.binance.com/api/v3';

  getName(): string {
    return 'Binance';
  }

  /**
   * VIỆC 2: Implement IMarketProvider.getPrice
   */
  async getPrice(symbol: string): Promise<IMarketPrice> {
    try {
      const url = `${this.baseUrl}/ticker/24hr`;
      const response = await axios.get(url, {
        params: { symbol: symbol.toUpperCase() },
      });

      const data = response.data;
      return {
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        timestamp: new Date(data.closeTime),
        volume: parseFloat(data.volume),
        change24h: parseFloat(data.priceChangePercent),
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch price for ${symbol}:`,
        error.message,
      );
      throw new Error(`Binance API error: ${error.message}`);
    }
  }

  /**
   * VIỆC 2: Implement IMarketProvider.getHistory
   */
  async getHistory(
    symbol: string,
    timeframe: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<IMarketHistory> {
    try {
      const url = `${this.baseUrl}/klines`;
      const params: any = {
        symbol: symbol.toUpperCase(),
        interval: this.convertTimeframe(timeframe),
        limit: 1000,
      };

      if (startTime) {
        params.startTime = startTime.getTime();
      }
      if (endTime) {
        params.endTime = endTime.getTime();
      }

      const response = await axios.get(url, { params });
      const candles: ICandle[] = response.data.map((kline: any[]) => ({
        timestamp: new Date(kline[0]),
        open: parseFloat(kline[1]),
        high: parseFloat(kline[2]),
        low: parseFloat(kline[3]),
        close: parseFloat(kline[4]),
        volume: parseFloat(kline[5]),
      }));

      return {
        symbol,
        timeframe,
        data: candles,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch history for ${symbol}:`,
        error.message,
      );
      throw new Error(`Binance API error: ${error.message}`);
    }
  }

  /**
   * Get multiple prices at once
   */
  async getPrices(symbols: string[]): Promise<IMarketPrice[]> {
    try {
      const promises = symbols.map((symbol) => this.getPrice(symbol));
      return await Promise.all(promises);
    } catch (error) {
      this.logger.error('Failed to fetch multiple prices:', error.message);
      throw new Error(`Binance API error: ${error.message}`);
    }
  }

  /**
   * Helper: Convert timeframe format
   */
  private convertTimeframe(timeframe: string): string {
    // Map our format to Binance format
    const map: Record<string, string> = {
      '1m': '1m',
      '5m': '5m',
      '15m': '15m',
      '1h': '1h',
      '4h': '4h',
      '1d': '1d',
    };
    return map[timeframe] || '1h';
  }
}
