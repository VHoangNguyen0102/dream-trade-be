import { Controller, Post, Get, Body, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AnalysisService } from './analysis.service';
import { SentimentDto } from './dto/sentiment.dto';
import { CausalMatchDto } from './dto/causal-match.dto';

@ApiTags('analysis')
@Controller('analysis')
export class AnalysisController {
  constructor(private readonly analysisService: AnalysisService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check' })
  health() {
    return { status: 'ok', service: 'ai-analysis', timestamp: new Date().toISOString() };
  }

  @Post('sentiment')
  @ApiOperation({ summary: 'Analyze sentiment of text' })
  @ApiResponse({ status: 200, description: 'Sentiment analysis result' })
  async analyzeSentiment(@Body() dto: SentimentDto) {
    return this.analysisService.analyzeSentiment(dto.text, dto.strategy || 'simple');
  }

  @Post('causal-match')
  @ApiOperation({ summary: 'Find causal relationships between news and price movements' })
  @ApiResponse({ status: 200, description: 'Causal matching results' })
  async findCausalMatches(@Body() dto: CausalMatchDto) {
    return this.analysisService.findCausalMatches(
      dto.newsArticles,
      dto.priceData,
      dto.timeWindowMinutes || 60
    );
  }

  @Get('test')
  @ApiOperation({ summary: 'Test endpoint with sample data' })
  async test(@Query('strategy') strategy?: string) {
    const testText = 'Bitcoin price surges to new all-time high! Investors are very excited.';
    return this.analyzeSentiment({ text: testText, strategy: strategy || 'simple' });
  }
}
