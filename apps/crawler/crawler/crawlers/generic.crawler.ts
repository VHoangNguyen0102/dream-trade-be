import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { ICrawler, INewsArticle } from '@shared/interfaces/crawler.interface';

/**
 * Generic Crawler - Works with most websites
 * VIỆC 1: Output là JSON (Title, Body, Time)
 * GIAI ĐOẠN 1 - TUẦN 2
 */
@Injectable()
export class GenericCrawler implements ICrawler {
  private readonly logger = new Logger(GenericCrawler.name);

  getName(): string {
    return 'GenericCrawler';
  }

  canHandle(url: string): boolean {
    // Generic crawler handles everything as fallback
    return true;
  }

  /**
   * VIỆC 1: Input URL -> Output JSON
   */
  async crawl(url: string): Promise<INewsArticle> {
    try {
      const response = await axios.get(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsBot/1.0)',
        },
      });

      const $ = cheerio.load(response.data);

      // GIAI ĐOẠN 2 - TUẦN 3: Dynamic parsing
      // Tự động nhận diện thẻ article, title, body
      const article = this.extractArticle($, url);

      return article;
    } catch (error) {
      this.logger.error(`Failed to crawl ${url}:`, error.message);
      throw new Error(`Crawl failed: ${error.message}`);
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

  /**
   * GIAI ĐOẠN 2 - TUẦN 3: Dynamic Parsing
   * Thay vì hardcode CSS selector, tự động tìm
   */
  private extractArticle($: cheerio.CheerioAPI, url: string): INewsArticle {
    // Try multiple common selectors
    const titleSelectors = [
      'h1',
      'article h1',
      '.article-title',
      '[itemprop="headline"]',
      'meta[property="og:title"]',
    ];

    const bodySelectors = [
      'article',
      '.article-body',
      '.post-content',
      '[itemprop="articleBody"]',
      'main',
    ];

    const dateSelectors = [
      'time',
      '.published-date',
      '[itemprop="datePublished"]',
      'meta[property="article:published_time"]',
    ];

    const title = this.findBySelectors($, titleSelectors);
    const body = this.findBySelectors($, bodySelectors);
    const dateStr = this.findBySelectors($, dateSelectors);

    return {
      title: title || 'Untitled',
      body: body || '',
      summary: body ? body.substring(0, 200) + '...' : '',
      publishedAt: dateStr ? new Date(dateStr) : new Date(),
      url,
      source: new URL(url).hostname,
    };
  }

  private findBySelectors(
    $: cheerio.CheerioAPI,
    selectors: string[],
  ): string {
    for (const selector of selectors) {
      const element = $(selector);
      if (element.length > 0) {
        // Check for meta tags
        if (selector.startsWith('meta')) {
          return element.attr('content') || '';
        }
        return element.first().text().trim();
      }
    }
    return '';
  }
}
