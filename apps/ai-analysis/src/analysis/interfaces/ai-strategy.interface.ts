export interface IAIStrategy {
  analyze(text: string): Promise<SentimentResult>;
}

export interface SentimentResult {
  sentiment: 'positive' | 'negative' | 'neutral';
  score: number;
  details?: any;
}
