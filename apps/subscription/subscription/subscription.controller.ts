import { Controller, Get, Post, Param, Body, Request, UseGuards, Logger, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SubscriptionService } from './subscription.service';
import { UpgradeSubscriptionDto } from './dto/upgrade-subscription.dto';
import { InternalAuthGuard } from './guards/internal-auth.guard';

@ApiTags('subscriptions')
@Controller('subscriptions')
@UseGuards(InternalAuthGuard)
@ApiBearerAuth()
export class SubscriptionController {
  private readonly logger = new Logger(SubscriptionController.name);

  constructor(private readonly subscriptionService: SubscriptionService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user subscription' })
  async getMySubscription(@Request() req) {
    const userId = req.user.sub;
    this.logger.log(`Getting subscription for user ${userId}`);
    return this.subscriptionService.getUserSubscription(userId);
  }

  @Get('plans')
  @ApiOperation({ summary: 'Get available pricing plans' })
  getAvailablePlans() {
    this.logger.log('Getting available pricing plans');
    return this.subscriptionService.getAvailablePlans();
  }

  @Get('plans/:id')
  @ApiOperation({ summary: 'Get plan by ID' })
  @ApiParam({ name: 'id', enum: ['free', 'vip'], description: 'Plan ID' })
  getPlanById(@Param('id') id: string) {
    this.logger.log(`Getting plan by ID: ${id}`);
    const plan = this.subscriptionService.getPlanById(id);
    if (!plan) {
      throw new NotFoundException(`Plan with id ${id} not found`);
    }
    return plan;
  }

  @Post('upgrade')
  @ApiOperation({ summary: 'Upgrade subscription to VIP' })
  async upgradeSubscription(@Request() req, @Body() upgradeDto: UpgradeSubscriptionDto) {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} upgrading to ${upgradeDto.plan}`);
    return this.subscriptionService.upgradeToVip(userId);
  }

  @Post('cancel')
  @ApiOperation({ summary: 'Cancel subscription (downgrade to free)' })
  async cancelSubscription(@Request() req) {
    const userId = req.user.sub;
    this.logger.log(`User ${userId} cancelling subscription`);
    return this.subscriptionService.cancelSubscription(userId);
  }

  @Get('billing-history')
  @ApiOperation({ summary: 'Get billing history for current user' })
  async getBillingHistory(@Request() req) {
    const userId = req.user.sub;
    this.logger.log(`Getting billing history for user ${userId}`);
    return this.subscriptionService.getBillingHistory(userId);
  }
}
