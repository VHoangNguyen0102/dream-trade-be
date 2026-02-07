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
    'subscription-service': process.env.SUBSCRIPTION_SERVICE_URL || 'http://localhost:3006',
  };

  // Only strip prefix for services that don't include it in their endpoints
  private stripPrefix: Set<string> = new Set([
    'ai-analysis-service', // AI service endpoints don't have /analysis prefix
    'news-crawler-service', // Crawler service endpoints don't have /crawler prefix
  ]);

  constructor(private readonly httpService: HttpService) {}

  async proxy(req: Request, res: Response, serviceName: string): Promise<void> {
    try {
      const serviceUrl = this.serviceUrls[serviceName];
      if (!serviceUrl) {
        throw new Error(`Service ${serviceName} not found`);
      }

      // Strip the gateway prefix only for services that need it
      let targetPath = req.path;
      if (this.stripPrefix.has(serviceName)) {
        // For AI service: /analysis/api/xyz -> /api/xyz
        // For Crawler service: /crawler/api/v1/articles -> /api/v1/articles
        const prefixMap: Record<string, string> = {
          'ai-analysis-service': '/analysis',
          'news-crawler-service': '/crawler',
        };
        const prefix = prefixMap[serviceName];
        if (prefix && targetPath.startsWith(prefix)) {
          targetPath = targetPath.substring(prefix.length) || '/';
        }
      }

      const targetUrl = `${serviceUrl}${targetPath}`;

      this.logger.log(`Proxying ${req.method} ${req.url} -> ${targetUrl}`);
      this.logger.debug(`Query params:`, req.query);

      // Prepare headers - remove problematic ones
      const { host, 'content-length': _, ...forwardHeaders } = req.headers as any;

      // Ensure X-User-Id and X-User-Email are forwarded (injected by GatewayAuthGuard)
      const headersToForward: Record<string, string> = {
        ...forwardHeaders,
        host: new URL(serviceUrl).host,
      };

      // Forward request
      const response = await firstValueFrom(
        this.httpService.request({
          method: req.method,
          url: targetUrl,
          data: req.body,
          headers: headersToForward,
          params: req.query, // Axios will properly encode query params
        })
      );

      // Forward Set-Cookie headers if present
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        res.setHeader('Set-Cookie', setCookieHeader);
      }

      // Forward response
      res.status(response.status).json(response.data);
    } catch (error: any) {
      this.logger.error(`Proxy error for ${serviceName}:`, error.message);

      const status = error.response?.status || 500;
      const data = error.response?.data || {
        error: 'Service unavailable',
        message: error.message,
      };

      res.status(status).json(data);
    }
  }
}
