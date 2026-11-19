import mongoose, { Schema, Document } from 'mongoose';
import { IFeedback } from './types.js';

export interface IFeedbackDocument extends Omit<IFeedback, 'id'>, Document {
  id: string;
}

const FeedbackSchema = new Schema<IFeedbackDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    requestId: { type: String, default: 'untracked' },
    inputText: { type: String, required: true },
    aslGloss: { type: String, default: '' },
    issueCategory: {
      type: String,
      enum: ['inaccurate_gloss', 'missing_sign', 'grammar_error', 'inappropriate_media', 'other'],
      required: true,
    },
    comments: { type: String, default: '' },
    status: {
      type: String,
      enum: ['pending', 'reviewed', 'resolved'],
      default: 'pending',
    },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    collection: 'feedback',
    timestamps: false,
    toJSON: {
      transform: (_doc, ret: any) => {
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const FeedbackModel =
  mongoose.models.Feedback || mongoose.model<IFeedbackDocument>('Feedback', FeedbackSchema);
