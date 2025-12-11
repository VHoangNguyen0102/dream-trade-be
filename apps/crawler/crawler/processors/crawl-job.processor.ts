import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CrawlerService } from '../crawler.service';

/**
 * COMMAND PATTERN - Job Queue Processor
 * Xử lý crawl jobs từ queue
 * GIAI ĐOẠN 2 - TUẦN 4
 */
@Processor('crawl-queue')
export class CrawlJobProcessor {
  private readonly logger = new Logger(CrawlJobProcessor.name);

  constructor(private readonly crawlerService: CrawlerService) {}

  @Process('crawl')
  async handleCrawlJob(job: Job) {
    const { url } = job.data;
    this.logger.log(`Processing crawl job for: ${url}`);

    try {
      await this.crawlerService.crawlUrl(url);
      this.logger.log(`Successfully crawled: ${url}`);
    } catch (error) {
      this.logger.error(`Failed to process job for ${url}:`, error.message);
      throw error; // Will trigger retry logic
    }
  }
}
