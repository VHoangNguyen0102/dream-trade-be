import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsNotEmpty } from 'class-validator';

/**
 * Upgrade Subscription DTO
 */
export class UpgradeSubscriptionDto {
  @ApiProperty({ example: 'vip', enum: ['vip'], description: 'Plan to upgrade to' })
  @IsEnum(['vip'])
  @IsNotEmpty()
  plan: 'vip';
}
