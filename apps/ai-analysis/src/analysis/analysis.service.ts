import { Injectable } from '@nestjs/common';
import { StrategyFactory } from './strategies/strategy.factory';

export interface NewsArticle {
  title: string;
  publishedAt: Date;
  sentiment?: string;
}

export interface PriceData {
  symbol: string;
  price: number;
  timestamp: Date;
}

export interface CausalMatch {
  news: NewsArticle;
  priceChange: {
    before: number;
    after: number;
    percentChange: number;
  };
  timeGapMinutes: number;
  confidence: number;
}

@Injectable()
export class AnalysisService {
  constructor(private readonly strategyFactory: StrategyFactory) {}

  async analyzeSentiment(text: string, strategyName: string = 'simple') {
    const strategy = this.strategyFactory.getStrategy(strategyName);
    const result = await strategy.analyze(text);

    return {
      text,
      sentiment: result.sentiment,
      score: result.score,
      strategy: strategyName,
      timestamp: new Date().toISOString(),
    };
  }

  async findCausalMatches(
    newsArticles: NewsArticle[],
    priceData: PriceData[],
    timeWindowMinutes: number = 60,
  ): Promise<CausalMatch[]> {
    const matches: CausalMatch[] = [];

    for (const news of newsArticles) {
      const newsTime = new Date(news.publishedAt).getTime();

      // Find price 30 minutes before news
      const priceBefore = this.findClosestPrice(
        priceData,
        newsTime - 30 * 60 * 1000,
      );

      // Find prices after news (15, 30, 60 minutes)
      const priceAfter15 = this.findClosestPrice(
        priceData,
        newsTime + 15 * 60 * 1000,
      );
      const priceAfter30 = this.findClosestPrice(
        priceData,
        newsTime + 30 * 60 * 1000,
      );
      const priceAfter60 = this.findClosestPrice(
        priceData,
        newsTime + timeWindowMinutes * 60 * 1000,
      );

      if (priceBefore && priceAfter60) {
        const percentChange =
          ((priceAfter60.price - priceBefore.price) / priceBefore.price) * 100;

        // Only create match if significant price change (>1%)
        if (Math.abs(percentChange) > 1) {
          const timeGapMinutes = Math.round(
            (priceAfter60.timestamp.getTime() - newsTime) / 60000,
          );

          // Calculate confidence based on price change magnitude and time proximity
          const priceScore = Math.min(Math.abs(percentChange) / 10, 1); // Max at 10% change
          const timeScore = 1 - timeGapMinutes / timeWindowMinutes;
          const confidence = priceScore * 0.6 + timeScore * 0.4;

          matches.push({
            news,
            priceChange: {
              before: priceBefore.price,
              after: priceAfter60.price,
              percentChange: Number(percentChange.toFixed(2)),
            },
            timeGapMinutes,
            confidence: Number((confidence * 100).toFixed(2)),
          });
        }
      }
    }

    // Sort by confidence descending
    return matches.sort((a, b) => b.confidence - a.confidence);
  }

  private findClosestPrice(
    priceData: PriceData[],
    targetTime: number,
  ): PriceData | null {
    if (priceData.length === 0) return null;

    return priceData.reduce((closest, current) => {
      const currentDiff = Math.abs(
        new Date(current.timestamp).getTime() - targetTime,
      );
      const closestDiff = Math.abs(
        new Date(closest.timestamp).getTime() - targetTime,
      );
      return currentDiff < closestDiff ? current : closest;
    });
  }
}
