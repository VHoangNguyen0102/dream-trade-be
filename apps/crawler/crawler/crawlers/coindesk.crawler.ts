import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ICrawler, INewsArticle } from '@shared/interfaces/crawler.interface';

/**
 * Specialized crawler for CoinDesk
 * Example of how to add site-specific crawlers
 */
@Injectable()
export class CoinDeskCrawler implements ICrawler {
  private readonly logger = new Logger(CoinDeskCrawler.name);

  getName(): string {
    return 'CoinDeskCrawler';
  }

  canHandle(url: string): boolean {
    return url.includes('coindesk.com');
  }

  async crawl(url: string): Promise<INewsArticle> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
        },
      });

      const $ = cheerio.load(response.data);

      // CoinDesk-specific selectors
      const title = $('h1.headline').text().trim() || $('h1').first().text().trim();
      const body = $('.article-body').text().trim() || $('article').text().trim();
      const author = $('.author-name').text().trim();
      const dateStr = $('time').attr('datetime') || new Date().toISOString();

      return {
        title,
        body,
        summary: body.substring(0, 200) + '...',
        publishedAt: new Date(dateStr),
        url,
        source: 'CoinDesk',
        author: author || undefined,
        tags: ['crypto', 'news'],
      };
    } catch (error) {
      this.logger.error(`Failed to crawl CoinDesk article:`, error.message);
      throw new Error(`CoinDesk crawl failed: ${error.message}`);
    }
  }

  async crawlBatch(urls: string[]): Promise<INewsArticle[]> {
    const results = await Promise.allSettled(
      urls.map((url) => this.crawl(url)),
    );

    return results
      .filter((r) => r.status === 'fulfilled')
      .map((r: any) => r.value);
  }
}
