import { Injectable } from '@nestjs/common';
import { IAIStrategy, SentimentResult } from '../interfaces/ai-strategy.interface';

@Injectable()
export class GPTSentimentStrategy implements IAIStrategy {
  async analyze(text: string): Promise<SentimentResult> {
    // TODO: Implement OpenAI GPT integration
    // For now, return mock result
    console.log('GPT Strategy called (not implemented yet)');

    return {
      sentiment: 'neutral',
      score: 0,
      details: {
        message: 'GPT sentiment analysis not implemented yet',
        text,
      },
    };
  }
}
