import { Injectable } from '@nestjs/common';
import { SimpleSentimentStrategy } from './simple-sentiment.strategy';
import { GPTSentimentStrategy } from './gpt-sentiment.strategy';
import { IAIStrategy } from '../interfaces/ai-strategy.interface';

@Injectable()
export class StrategyFactory {
  constructor(
    private readonly simpleStrategy: SimpleSentimentStrategy,
    private readonly gptStrategy: GPTSentimentStrategy,
  ) {}

  getStrategy(name: string): IAIStrategy {
    switch (name.toLowerCase()) {
      case 'simple':
        return this.simpleStrategy;
      case 'gpt':
        return this.gptStrategy;
      default:
        return this.simpleStrategy;
    }
  }
}
