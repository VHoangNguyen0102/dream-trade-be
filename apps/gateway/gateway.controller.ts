import { Controller, All, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './services/proxy.service';
import { VipForAnalysisGuard } from './guards/vip-for-analysis.guard';
import { Public } from './decorators/public.decorator';

@Controller()
export class GatewayController {
  constructor(private readonly proxyService: ProxyService) {}

  /**
   * Route all /market/* requests to Market Service (PUBLIC)
   */
  @All('market/*')
  @Public()
  async proxyMarket(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res, 'market-service');
  }

  /**
   * Route all /crawler/* requests to News Crawler Service (PUBLIC)
   */
  @All('crawler/*')
  @Public()
  async proxyCrawler(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res, 'news-crawler-service');
  }

  /**
   * Route all /analysis/* requests to AI Analysis Service (PROTECTED + VIP only)
   * GatewayAuthGuard (global) verifies JWT first, then VipForAnalysisGuard checks plan
   */
  @All('analysis/*')
  @UseGuards(VipForAnalysisGuard)
  async proxyAnalysis(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res, 'ai-analysis-service');
  }

  /**
   * Route all /auth/* requests to Auth Service (PUBLIC)
   * Auth service handles its own authentication internally
   */
  @All('auth/*')
  @Public()
  async proxyAuth(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res, 'auth-service');
  }

  /**
   * Route all /subscriptions/* requests to Subscription Service (PROTECTED)
   * GatewayAuthGuard (global) verifies JWT, injects X-User-Id header
   */
  @All('subscriptions/*')
  async proxySubscription(@Req() req: Request, @Res() res: Response) {
    return this.proxyService.proxy(req, res, 'subscription-service');
  }

  /**
   * Health check (PUBLIC)
   */
  @All('health')
  @Public()
  health() {
    return {
      status: 'ok',
      service: 'gateway',
      timestamp: new Date().toISOString(),
    };
  }
}
