import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './services/proxy.service';
import { VipForAnalysisGuard } from './guards/vip-for-analysis.guard';

@Controller()
export class GatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Route all /market/* requests to Market Service
   */
  @All('market/*')
  async proxyMarket(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res, 'market-service');
  }

  /**
   * Route all /crawler/* requests to News Crawler Service
   */
  @All('crawler/*')
  async proxyCrawler(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res, 'news-crawler-service');
  }

  /**
   * Route all /analysis/* requests to AI Analysis Service (VIP only)
   */
  @All('analysis/*')
  @UseGuards(VipForAnalysisGuard)
  async proxyAnalysis(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res, 'ai-analysis-service');
  }

  /**
   * Route all /auth/* requests to Auth Service
   */
  @All('auth/*')
  async proxyAuth(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res, 'auth-service');
  }

  /**
   * Route all /subscriptions/* requests to Subscription Service
   */
  @All('subscriptions/*')
  async proxySubscription(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res, 'subscription-service');
  }

  /**
   * Health check
   */
  @All('health')
  health() {
    return {
      status: 'ok',
      service: 'gateway',
      timestamp: new Date().toISOString(),
    };
  }
}
