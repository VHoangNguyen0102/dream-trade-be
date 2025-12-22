import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class TokenBlacklist extends Document {
  @Prop({ type: String, required: true, unique: true })
  token: string;

  @Prop({ type: String, required: true })
  userId: string;

  @Prop({ type: Date, required: true })
  expiresAt: Date;

  @Prop({ type: Date })
  createdAt: Date;
}

export const TokenBlacklistSchema = SchemaFactory.createForClass(TokenBlacklist);

// Indexes
TokenBlacklistSchema.index({ token: 1 });
TokenBlacklistSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index
