/**
 * Interface for Realtime Service (Observer Pattern)
 * Lâm's responsibility - Realtime Service
 */

export interface IPriceUpdate {
  symbol: string;
  price: number;
  timestamp: Date;
  change?: number;
  changePercent?: number;
}

export interface INewsAlert {
  id: string;
  title: string;
  sentiment: 'positive' | 'negative' | 'neutral';
  impact: 'high' | 'medium' | 'low';
  timestamp: Date;
}

export interface IMarketEvent {
  type: 'price_update' | 'news_alert' | 'analysis_complete';
  data: IPriceUpdate | INewsAlert | any;
  timestamp: Date;
}

/**
 * Observer interface for WebSocket clients
 */
export interface IRealtimeObserver {
  /**
   * Called when new data is available
   */
  onUpdate(event: IMarketEvent): void;

  /**
   * Get observer ID
   */
  getId(): string;
}

/**
 * Publisher interface for realtime events
 */
export interface IRealtimePublisher {
  /**
   * Subscribe to events
   */
  subscribe(observer: IRealtimeObserver, topics: string[]): void;

  /**
   * Unsubscribe from events
   */
  unsubscribe(observer: IRealtimeObserver): void;

  /**
   * Publish an event to all subscribers
   */
  publish(topic: string, event: IMarketEvent): void;
}
