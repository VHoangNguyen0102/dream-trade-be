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
   * Get exchange information (trading pairs, symbols)
   */
  async getExchangeInfo(symbol?: string, symbols?: string[]) {
    try {
      const url = `${this.baseUrl}/exchangeInfo`;
      const params: any = {};

      if (symbol) {
        params.symbol = symbol.toUpperCase();
      } else if (symbols && symbols.length > 0) {
        params.symbols = JSON.stringify(symbols.map((s) => s.toUpperCase()));
      }

      const response = await axios.get(url, { params });
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to fetch exchange info:', error.message);
      throw new Error(`Binance API error: ${error.message}`);
    }
  }

  /**
   * Get average price for a symbol
   */
  async getAvgPrice(symbol: string) {
    try {
      const url = `${this.baseUrl}/avgPrice`;
      const response = await axios.get(url, {
        params: { symbol: symbol.toUpperCase() },
      });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch avg price for ${symbol}:`,
        error.message,
      );
      throw new Error(`Binance API error: ${error.message}`);
    }
  }

  /**
   * Get best bid/ask price (book ticker)
   */
  async getBookTicker(symbol?: string, symbols?: string[]) {
    try {
      const url = `${this.baseUrl}/ticker/bookTicker`;
      const params: any = {};

      if (symbol) {
        params.symbol = symbol.toUpperCase();
      } else if (symbols && symbols.length > 0) {
        params.symbols = JSON.stringify(symbols.map((s) => s.toUpperCase()));
      }

      const response = await axios.get(url, { params });
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to fetch book ticker:', error.message);
      throw new Error(`Binance API error: ${error.message}`);
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
  ) {
    try {
      const url = `${this.baseUrl}/uiKlines`;
      const params: any = {
        symbol: symbol.toUpperCase(),
        interval: this.convertTimeframe(interval),
      };

      if (startTime) {
        params.startTime = startTime;
      }
      if (endTime) {
        params.endTime = endTime;
      }
      if (limit) {
        params.limit = limit;
      }

      const response = await axios.get(url, { params });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch UI klines for ${symbol}:`,
        error.message,
      );
      throw new Error(`Binance API error: ${error.message}`);
    }
  }

  /**
   * Get 24hr ticker statistics
   * Supports single symbol, multiple symbols, or all symbols
   */
  async getTicker24hr(
    symbol?: string,
    symbols?: string[],
    type: 'FULL' | 'MINI' = 'FULL',
  ) {
    try {
      const url = `${this.baseUrl}/ticker/24hr`;
      const params: any = {};

      if (symbol) {
        params.symbol = symbol.toUpperCase();
      } else if (symbols && symbols.length > 0) {
        params.symbols = JSON.stringify(symbols.map((s) => s.toUpperCase()));
      }

      if (type === 'MINI') {
        params.type = 'MINI';
      }

      const response = await axios.get(url, { params });
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to fetch 24hr ticker:', error.message);
      throw new Error(`Binance API error: ${error.message}`);
    }
  }

  /**
   * Get simple price ticker
   * Supports single symbol, multiple symbols, or all symbols
   */
  async getTickerPrice(symbol?: string, symbols?: string[]) {
    try {
      const url = `${this.baseUrl}/ticker/price`;
      const params: any = {};

      if (symbol) {
        params.symbol = symbol.toUpperCase();
      } else if (symbols && symbols.length > 0) {
        params.symbols = JSON.stringify(symbols.map((s) => s.toUpperCase()));
      }

      const response = await axios.get(url, { params });
      return response.data;
    } catch (error: any) {
      this.logger.error('Failed to fetch ticker price:', error.message);
      throw new Error(`Binance API error: ${error.message}`);
    }
  }

  /**
   * Get klines with full parameter support
   */
  async getKlines(
    symbol: string,
    interval: string,
    startTime?: number,
    endTime?: number,
    limit?: number,
  ) {
    try {
      const url = `${this.baseUrl}/klines`;
      const params: any = {
        symbol: symbol.toUpperCase(),
        interval: this.convertTimeframe(interval),
      };

      if (startTime) {
        params.startTime = startTime;
      }
      if (endTime) {
        params.endTime = endTime;
      }
      if (limit) {
        params.limit = Math.min(limit, 1000); // Binance max is 1000
      }

      const response = await axios.get(url, { params });
      return response.data;
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch klines for ${symbol}:`,
        error.message,
      );
      throw new Error(`Binance API error: ${error.message}`);
    }
  }

  /**
   * Helper: Convert timeframe format
   */
  private convertTimeframe(timeframe: string): string {
    // Map our format to Binance format
    const map: Record<string, string> = {
      '1s': '1s',
      '1m': '1m',
      '3m': '3m',
      '5m': '5m',
      '15m': '15m',
      '30m': '30m',
      '1h': '1h',
      '2h': '2h',
      '4h': '4h',
      '6h': '6h',
      '8h': '8h',
      '12h': '12h',
      '1d': '1d',
      '3d': '3d',
      '1w': '1w',
      '1M': '1M',
    };
    return map[timeframe] || timeframe;
  }
}
