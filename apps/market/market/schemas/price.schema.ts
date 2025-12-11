import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class Price extends Document {
  @Prop({ required: true, index: true })
  symbol: string;

  @Prop({ required: true })
  price: number;

  @Prop({ required: true, index: true })
  timestamp: Date;

  @Prop()
  volume?: number;

  @Prop()
  change24h?: number;
}

export const PriceSchema = SchemaFactory.createForClass(Price);

// Compound index for efficient queries
PriceSchema.index({ symbol: 1, timestamp: -1 });
