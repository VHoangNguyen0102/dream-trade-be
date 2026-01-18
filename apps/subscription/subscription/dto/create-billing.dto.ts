import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsEnum, IsOptional, IsNotEmpty, Min } from 'class-validator';

/**
 * Create Billing Record DTO
 */
export class CreateBillingDto {
  @ApiProperty({ example: 29.99, description: 'Billing amount' })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({ example: 'USD', description: 'Currency code', required: false, default: 'USD' })
  @IsString()
  @IsOptional()
  currency?: string;

  @ApiProperty({ example: 'VIP Subscription - January 2024', description: 'Billing description' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ example: 'vip', enum: ['free', 'vip'], description: 'Subscription plan' })
  @IsEnum(['free', 'vip'])
  @IsNotEmpty()
  plan: 'free' | 'vip';
}
