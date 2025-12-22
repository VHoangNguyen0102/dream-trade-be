import { Injectable, Logger } from '@nestjs/common';
import { ICrawler, ICrawlerFactory } from '@shared/interfaces/crawler.interface';
import { GenericCrawler } from '../crawlers/generic.crawler';
import { CoinDeskCrawler } from '../crawlers/coindesk.crawler';

/**
 * FACTORY PATTERN - Nguyên's implementation
 * GIAI ĐOẠN 1 - TUẦN 2
 * 
 * Tạo crawler phù hợp cho từng URL/site
 * Dễ dàng thêm crawler mới (CoinTelegraph, Bitcoin.com, etc.)
 */
@Injectable()
export class CrawlerFactory implements ICrawlerFactory {
  private readonly logger = new Logger(CrawlerFactory.name);
  private crawlers: Map<string, ICrawler> = new Map();

  constructor(
    private readonly genericCrawler: GenericCrawler,
    private readonly coinDeskCrawler: CoinDeskCrawler,
  ) {
    // Register available crawlers
    this.registerCrawler('generic', genericCrawler);
    this.registerCrawler('coindesk', coinDeskCrawler);
  }

  /**
   * Create appropriate crawler for the URL
   */
  createCrawler(url: string): ICrawler {
    this.logger.log(`Creating crawler for: ${url}`);

    // Check if we have a specialized crawler for this domain
    for (const [name, crawler] of this.crawlers.entries()) {
      if (crawler.canHandle(url)) {
        this.logger.log(`Using ${name} crawler`);
        return crawler;
      }
    }

    // Default to generic crawler
    this.logger.log('Using generic crawler');
    return this.genericCrawler;
  }

  /**
   * Register a new crawler type
   */
  registerCrawler(name: string, crawler: ICrawler): void {
    this.crawlers.set(name, crawler);
    this.logger.log(`Registered crawler: ${name}`);
  }
}
