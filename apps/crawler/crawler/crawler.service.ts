import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { InjectQueue } from '@nestjs/bull';
import { Model } from 'mongoose';
import { Queue } from 'bull';
import { CrawlerFactory } from './factories/crawler.factory';
import { NewsArticle } from './schemas/news-article.schema';
import { INewsArticle } from '@shared/interfaces/crawler.interface';

@Injectable()
export class CrawlerService {
  private readonly logger = new Logger(CrawlerService.name);

  constructor(
    private readonly crawlerFactory: CrawlerFactory,
    @InjectModel(NewsArticle.name)
    private readonly newsModel: Model<NewsArticle>,
    @InjectQueue('crawl-queue') private crawlQueue: Queue,
  ) {}

  /**
   * Crawl a single URL immediately
   * GIAI ĐOẠN 1 - TUẦN 2
   */
  async crawlUrl(url: string): Promise<INewsArticle> {
    try {
      this.logger.log(`Crawling URL: ${url}`);
      const crawler = this.crawlerFactory.createCrawler(url);
      const article = await crawler.crawl(url);

      // Save to MongoDB
      const savedArticle = new this.newsModel(article);
      await savedArticle.save();

      this.logger.log(`Article saved: ${article.title}`);
      return article;
    } catch (error) {
      this.logger.error(`Failed to crawl ${url}:`, error.message);
      throw error;
    }
  }

  /**
   * Add crawl jobs to queue (Command Pattern)
   * GIAI ĐOẠN 1 - TUẦN 2
   */
  async addCrawlJobs(urls: string[]): Promise<void> {
    for (const url of urls) {
      await this.crawlQueue.add(
        'crawl',
        { url },
        {
          attempts: 3, // Circuit Breaker: Retry 3 times
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );
    }
    this.logger.log(`Added ${urls.length} crawl jobs to queue`);
  }

  /**
   * Get recent articles from database
   */
  async getRecentArticles(limit = 10): Promise<NewsArticle[]> {
    return this.newsModel
      .find()
      .sort({ publishedAt: -1 })
      .limit(limit)
      .exec();
  }

  /**
   * Get a specific article
   */
  async getArticle(id: string): Promise<NewsArticle | null> {
    return this.newsModel.findById(id).exec();
  }
}
