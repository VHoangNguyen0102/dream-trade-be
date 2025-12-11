import { Module } from '@nestjs/common';
import { AnalysisController } from './analysis.controller';
import { AnalysisService } from './analysis.service';
import { SimpleSentimentStrategy } from './strategies/simple-sentiment.strategy';
import { GPTSentimentStrategy } from './strategies/gpt-sentiment.strategy';
import { StrategyFactory } from './strategies/strategy.factory';

@Module({
  controllers: [AnalysisController],
  providers: [
    AnalysisService,
    SimpleSentimentStrategy,
    GPTSentimentStrategy,
    StrategyFactory,
  ],
  exports: [AnalysisService],
})
export class AnalysisModule {}
