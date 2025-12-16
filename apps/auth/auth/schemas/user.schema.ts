import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { BaseSchema, baseSchemaOptions } from '@app/database';

/**
 * User Collection Schema
 * Fields: id (auto), email, password, firstName, lastName, createdAt, updatedAt, isDeleted
 */
@Schema(baseSchemaOptions)
export class User extends BaseSchema {
  // id tự động có từ MongoDB _id (kế thừa từ BaseSchema)

  @Prop({ type: String, required: true, unique: true, lowercase: true, trim: true })
  email: string;

  @Prop({ type: String, required: true, select: false }) // select: false để không trả password trong queries
  password: string;

  @Prop({ type: String, required: true, trim: true })
  firstName: string;

  @Prop({ type: String, required: true, trim: true })
  lastName: string;
}

export const UserSchema = SchemaFactory.createForClass(User);

// Indexes cho performance
UserSchema.index({ email: 1 }); // Unique index cho email
