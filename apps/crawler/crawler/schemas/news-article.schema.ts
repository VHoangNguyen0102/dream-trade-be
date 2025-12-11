import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class NewsArticle extends Document {
  @Prop({ required: true })
  title: string;

  @Prop({ required: true, type: String })
  body: string;

  @Prop()
  summary?: string;

  @Prop({ required: true })
  publishedAt: Date;

  @Prop({ required: true, unique: true })
  url: string;

  @Prop({ required: true })
  source: string;

  @Prop()
  author?: string;

  @Prop([String])
  tags?: string[];

  @Prop({ enum: ['positive', 'negative', 'neutral'] })
  sentiment?: string;
}

export const NewsArticleSchema = SchemaFactory.createForClass(NewsArticle);

NewsArticleSchema.index({ publishedAt: -1 });
NewsArticleSchema.index({ source: 1 });
