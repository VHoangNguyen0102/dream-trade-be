import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserSession extends Document {
  @Prop({ required: true, index: true })
  userId: string;

  @Prop({ required: true })
  token: string;

  @Prop({ enum: ['web', 'mobile', 'desktop'], default: 'web' })
  deviceType: string;

  @Prop()
  ipAddress?: string;

  @Prop()
  userAgent?: string;

  @Prop({ type: Date, default: Date.now })
  lastActivityAt: Date;

  @Prop()
  createdAt: Date;

  @Prop()
  updatedAt: Date;
}

export const UserSessionSchema = SchemaFactory.createForClass(UserSession);

// Indexes
UserSessionSchema.index({ userId: 1 });
UserSessionSchema.index({ token: 1 });
