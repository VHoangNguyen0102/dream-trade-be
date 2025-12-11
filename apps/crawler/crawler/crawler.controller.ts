import { Controller, Post, Body, Get, Param } from '@nestjs/common';
import { CrawlerService } from './crawler.service';

@Controller('crawler')
export class CrawlerController {
  constructor(private readonly crawlerService: CrawlerService) {}

  @Post('crawl')
  async crawlUrl(@Body('url') url: string) {
    return this.crawlerService.crawlUrl(url);
  }

  @Post('crawl-batch')
  async crawlBatch(@Body('urls') urls: string[]) {
    return this.crawlerService.addCrawlJobs(urls);
  }

  @Get('articles')
  async getArticles() {
    return this.crawlerService.getRecentArticles(10);
  }

  @Get('articles/:id')
  async getArticle(@Param('id') id: string) {
    return this.crawlerService.getArticle(id);
  }
}
