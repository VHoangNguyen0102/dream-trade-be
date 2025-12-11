import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Price } from '../schemas/price.schema';

/**
 * REPOSITORY PATTERN
 * Minh's implementation - Week 3
 * 
 * Abstracts database operations from business logic
 * Makes it easy to switch databases or add caching
 */
@Injectable()
export class PriceRepository {
  constructor(
    @InjectModel(Price.name) private readonly priceModel: Model<Price>,
  ) {}

  async create(priceData: Partial<Price>): Promise<Price> {
    const price = new this.priceModel(priceData);
    return price.save();
  }

  async findBySymbol(symbol: string, limit = 100): Promise<Price[]> {
    return this.priceModel
      .find({ symbol })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async findBySymbolAndTimeRange(
    symbol: string,
    startTime: Date,
    endTime: Date,
  ): Promise<Price[]> {
    return this.priceModel
      .find({
        symbol,
        timestamp: { $gte: startTime, $lte: endTime },
      })
      .sort({ timestamp: 1 })
      .exec();
  }

  async findLatest(symbol: string): Promise<Price | null> {
    return this.priceModel.findOne({ symbol }).sort({ timestamp: -1 }).exec();
  }

  async deleteOldPrices(olderThan: Date): Promise<number> {
    const result = await this.priceModel
      .deleteMany({ timestamp: { $lt: olderThan } })
      .exec();
    return result.deletedCount;
  }
}
