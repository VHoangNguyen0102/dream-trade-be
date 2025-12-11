/**
 * Event types for inter-service communication
 * Using Redis Pub/Sub or Message Queue
 */

export enum EventType {
  // Market events
  PRICE_UPDATED = 'price.updated',
  MARKET_DATA_FETCHED = 'market.data.fetched',

  // Crawler events
  NEWS_CRAWLED = 'news.crawled',
  CRAWL_FAILED = 'crawl.failed',

  // AI Analysis events
  NEWS_ANALYZED = 'news.analyzed',
  CAUSAL_MATCH_FOUND = 'causal.match.found',

  // Realtime events
  BROADCAST_PRICE = 'broadcast.price',
  BROADCAST_NEWS = 'broadcast.news',
}

export interface BaseEvent {
  eventType: EventType;
  timestamp: Date;
  serviceId: string;
}

export interface PriceUpdatedEvent extends BaseEvent {
  eventType: EventType.PRICE_UPDATED;
  data: {
    symbol: string;
    price: number;
    timestamp: Date;
  };
}

export interface NewsCrawledEvent extends BaseEvent {
  eventType: EventType.NEWS_CRAWLED;
  data: {
    id: string;
    title: string;
    body: string;
    publishedAt: Date;
    url: string;
    source: string;
  };
}

export interface NewsAnalyzedEvent extends BaseEvent {
  eventType: EventType.NEWS_ANALYZED;
  data: {
    newsId: string;
    sentiment: 'positive' | 'negative' | 'neutral';
    score: number;
  };
}

export type ServiceEvent = PriceUpdatedEvent | NewsCrawledEvent | NewsAnalyzedEvent;
