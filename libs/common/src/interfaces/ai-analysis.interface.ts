/**
 * Interface for AI Analysis Service (Strategy Pattern)
 * Lương's responsibility - AI Analysis Service
 */

export interface ISentimentAnalysis {
  label: 'positive' | 'negative' | 'neutral';
  score: number; // 0-1
  confidence: number; // 0-1
  keywords?: string[];
}

export interface ICausalMatch {
  newsId: string;
  newsTitle: string;
  newsTime: Date;
  priceTime: Date;
  priceChange: number;
  priceChangePercent: number;
  confidence: number;
  timeGapMinutes: number;
  impact: 'short-term' | 'long-term' | 'immediate';
}

export interface IAnalysisResult {
  newsId: string;
  sentiment: ISentimentAnalysis;
  causalMatches: ICausalMatch[];
  processedAt: Date;
}

/**
 * Strategy interface for different AI models
 */
export interface IAIStrategy {
  /**
   * Analyze text sentiment
   */
  analyzeSentiment(text: string): Promise<ISentimentAnalysis>;

  /**
   * Get strategy name
   */
  getName(): string;
}

/**
 * Main AI Analysis Service interface
 */
export interface IAIAnalysisService {
  /**
   * Analyze a single news article
   */
  analyzeNews(article: { title: string; body: string }): Promise<ISentimentAnalysis>;

  /**
   * Find causal relationships between news and price movements
   */
  findCausalMatches(
    news: Array<{ id: string; title: string; publishedAt: Date }>,
    priceHistory: Array<{ timestamp: Date; price: number }>,
  ): Promise<ICausalMatch[]>;

  /**
   * Full pipeline: analyze + match
   */
  processNewsWithPrices(
    newsId: string,
    newsText: string,
    newsTime: Date,
    priceHistory: Array<{ timestamp: Date; price: number }>,
  ): Promise<IAnalysisResult>;
}
