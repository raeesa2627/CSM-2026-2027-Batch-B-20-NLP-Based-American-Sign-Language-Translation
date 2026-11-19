import mongoose, { Schema, Document } from 'mongoose';
import { ISavedPhrase } from './types.js';

export interface ISavedPhraseDocument extends Omit<ISavedPhrase, 'id'>, Document {
  id: string;
}

const SavedPhraseSchema = new Schema<ISavedPhraseDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    userId: { type: String, required: true, index: true },
    englishText: { type: String, required: true },
    aslGloss: { type: String, required: true },
    category: {
      type: String,
      enum: ['assistance', 'medical', 'greetings', 'questions', 'custom'],
      default: 'custom',
    },
    isFavorite: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    collection: 'saved_phrases',
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

export const SavedPhraseModel =
  mongoose.models.SavedPhrase || mongoose.model<ISavedPhraseDocument>('SavedPhrase', SavedPhraseSchema);
