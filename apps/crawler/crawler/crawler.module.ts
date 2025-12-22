import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { MongooseModule } from '@nestjs/mongoose';
import { CrawlerController } from './crawler.controller';
import { CrawlerService } from './crawler.service';
import { CrawlerFactory } from './factories/crawler.factory';
import { GenericCrawler } from './crawlers/generic.crawler';
import { CoinDeskCrawler } from './crawlers/coindesk.crawler';
import { CrawlJobProcessor } from './processors/crawl-job.processor';
import { NewsArticle, NewsArticleSchema } from './schemas/news-article.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: NewsArticle.name, schema: NewsArticleSchema },
    ]),
    BullModule.registerQueue({
      name: 'crawl-queue',
    }),
  ],
  controllers: [CrawlerController],
  providers: [
    CrawlerService,
    CrawlerFactory,
    GenericCrawler,
    CoinDeskCrawler,
    CrawlJobProcessor,
  ],
  exports: [CrawlerService],
})
export class CrawlerModule {}
