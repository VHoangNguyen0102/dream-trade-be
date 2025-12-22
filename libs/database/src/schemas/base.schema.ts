import { Prop } from '@nestjs/mongoose';
import { Document } from 'mongoose';

/**
 * Abstract Base Schema
 * Cung cấp các trường chung cho tất cả schemas
 */
export abstract class BaseSchema extends Document {
  @Prop({ type: Date, default: Date.now })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;

  @Prop({ type: Boolean, default: false })
  isDeleted: boolean;

  @Prop({ type: Date, default: null })
  deletedAt?: Date;
}

/**
 * Cấu hình schema options chung
 */
export const baseSchemaOptions = {
  timestamps: true,
  toJSON: {
    virtuals: true,
    transform: (_doc: any, ret: any) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
  toObject: {
    virtuals: true,
  },
};
