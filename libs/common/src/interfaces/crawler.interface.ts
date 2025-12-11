/**
 * Interface for News Crawler (Factory Pattern)
 * Nguyên's responsibility - News Crawler Service
 */

export interface INewsArticle {
  id?: string;
  title: string;
  body: string;
  summary?: string;
  publishedAt: Date;
  url: string;
  source: string;
  author?: string;
  tags?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface ICrawlerConfig {
  url: string;
  selectors?: {
    title?: string;
    body?: string;
    date?: string;
    author?: string;
  };
  retryAttempts?: number;
  timeout?: number;
}

/**
 * Main interface for crawler implementations
 * Factory Pattern: Different crawlers for different sites
 */
export interface ICrawler {
  /**
   * Crawl a single URL
   */
  crawl(url: string): Promise<INewsArticle>;

  /**
   * Crawl multiple URLs
   */
  crawlBatch(urls: string[]): Promise<INewsArticle[]>;

  /**
   * Validate if this crawler can handle the URL
   */
  canHandle(url: string): boolean;

  /**
   * Get crawler name/type
   */
  getName(): string;
}

/**
 * Factory for creating appropriate crawler instances
 */
export interface ICrawlerFactory {
  /**
   * Create a crawler instance for the given URL
   */
  createCrawler(url: string): ICrawler;

  /**
   * Register a new crawler type
   */
  registerCrawler(name: string, crawler: ICrawler): void;
}
