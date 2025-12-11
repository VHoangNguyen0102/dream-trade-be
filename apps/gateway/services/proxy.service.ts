import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { Request, Response } from 'express';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  private serviceUrls: Record<string, string> = {
    'market-service': process.env.MARKET_SERVICE_URL || 'http://localhost:3001',
    'news-crawler-service': process.env.CRAWLER_SERVICE_URL || 'http://localhost:3002',
    'ai-analysis-service': process.env.AI_SERVICE_URL || 'http://localhost:3003',
    'auth-service': process.env.AUTH_SERVICE_URL || 'http://localhost:3005',
  };

  constructor(private readonly httpService: HttpService) {}

  async proxy(
    req: Request,
    res: Response,
    serviceName: string,
  ): Promise<void> {
    try {
      const serviceUrl = this.serviceUrls[serviceName];
      if (!serviceUrl) {
        throw new Error(`Service ${serviceName} not found`);
      }

      // Build target URL
      const targetUrl = `${serviceUrl}${req.url}`;
      this.logger.log(`Proxying ${req.method} ${req.url} -> ${targetUrl}`);

      // Forward request
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method,
          url: targetUrl,
          data: req.body,
          headers: {
            ...req.headers,
            host: new URL(serviceUrl).host,
          },
          params: req.query,
        }),
      );

      // Forward response
      res.status(response.status).json(response.data);
    } catch (error: any) {
      this.logger.error(
        `Proxy error for ${serviceName}:`,
        error.message,
      );

      const status = error.response?.status || 500;
      const data = error.response?.data || {
        error: 'Service unavailable',
        message: error.message,
      };

      res.status(status).json(data);
    }
  }
}
