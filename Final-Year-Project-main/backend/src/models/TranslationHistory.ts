import mongoose, { Schema, Document } from 'mongoose';
import { ITranslationHistory } from './types.js';

export interface ITranslationHistoryDocument extends Omit<ITranslationHistory, 'id'>, Document {
  id: string;
}

const TranslationHistorySchema = new Schema<ITranslationHistoryDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, index: true },
    inputType: { type: String, enum: ['text', 'speech', 'image'], required: true },
    inputText: { type: String, required: true },
    strategy: { type: String, default: 'rag_grounded' },
    aslGloss: { type: String, required: true },
    signsCount: { type: Number, default: 0 },
    coverage: { type: Number, default: 1.0 },
    overallLabel: { type: String, default: 'Processed' },
    durationMs: { type: Number, default: 0 },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
  },
  {
    collection: 'translation_histories',
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

export const TranslationHistoryModel =
  mongoose.models.TranslationHistory ||
  mongoose.model<ITranslationHistoryDocument>('TranslationHistory', TranslationHistorySchema);
