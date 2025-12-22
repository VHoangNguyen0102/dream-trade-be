import { Injectable } from '@nestjs/common';
import { IAIStrategy, SentimentResult } from '../interfaces/ai-strategy.interface';
import Sentiment from 'sentiment';

@Injectable()
export class SimpleSentimentStrategy implements IAIStrategy {
  private sentiment = new Sentiment();

  async analyze(text: string): Promise<SentimentResult> {
    const result = this.sentiment.analyze(text);

    let sentiment: 'positive' | 'negative' | 'neutral';
    if (result.score > 0) sentiment = 'positive';
    else if (result.score < 0) sentiment = 'negative';
    else sentiment = 'neutral';

    return {
      sentiment,
      score: result.score,
      details: {
        positive: result.positive,
        negative: result.negative,
        comparative: result.comparative,
      },
    };
  }
}
