/**
 * Common types shared across all services
 */

export type ServiceName =
  | 'market-service'
  | 'news-crawler-service'
  | 'ai-analysis-service'
  | 'realtime-service'
  | 'gateway';

export interface ServiceConfig {
  name: ServiceName;
  port: number;
  host: string;
  version: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
