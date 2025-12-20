import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserSession extends Document {
  @Prop({ type: String, required: true, index: true })
  userId: string;

  @Prop({ type: String, required: true })
  token: string;

  @Prop({ type: String, enum: ['web', 'mobile', 'desktop'], default: 'web' })
  deviceType: string;

  @Prop({ type: String })
  ipAddress?: string;

  @Prop({ type: String })
  userAgent?: string;

  @Prop({ type: Date, default: Date.now })
  lastActivityAt: Date;

  @Prop({ type: Date })
  createdAt: Date;

  @Prop({ type: Date })
  updatedAt: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// Indexes
UserSessionSchema.index({ userId: 1 });
UserSessionSchema.index({ token: 1 });
