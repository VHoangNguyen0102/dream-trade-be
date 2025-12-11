/**
 * Interface for Market Data Provider (Adapter Pattern)
 * Minh's responsibility - Market Service
 */

export interface IMarketPrice {
  symbol: string;
  price: number;
  timestamp: Date;
  volume?: number;
  change24h?: number;
}

export interface IMarketHistory {
  symbol: string;
  timeframe: string; // '1m', '5m', '1h', '1d', etc.
  data: ICandle[];
}

export interface ICandle {
  timestamp: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

/**
 * Main interface that all market providers must implement
 * Allows easy addition of new exchanges (OKX, Coinbase, etc.)
 */
export interface IMarketProvider {
  /**
   * Get current price for a symbol
   */
  getPrice(symbol: string): Promise<IMarketPrice>;

  /**
   * Get historical price data
   */
  getHistory(
    symbol: string,
    timeframe: string,
    startTime?: Date,
    endTime?: Date,
  ): Promise<IMarketHistory>;

  /**
   * Get multiple symbols at once
   */
  getPrices(symbols: string[]): Promise<IMarketPrice[]>;

  /**
   * Provider name (e.g., 'Binance', 'OKX')
   */
  getName(): string;
}
