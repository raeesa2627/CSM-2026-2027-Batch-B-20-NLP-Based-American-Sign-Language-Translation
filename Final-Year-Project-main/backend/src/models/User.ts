import mongoose, { Schema, Document } from 'mongoose';
import { IUser } from './types.js';

export interface IUserDocument extends Omit<IUser, 'id'>, Document {
  id: string;
}

const UserSchema = new Schema<IUserDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    passwordHash: { type: String, required: true },
    name: { type: String, required: true, trim: true },
    role: { type: String, enum: ['user', 'admin', 'reviewer'], default: 'user' },
    preferredMode: { type: String, enum: ['text', 'speech', 'image'], default: 'text' },
    historyRetentionEnabled: { type: Boolean, default: true },
    contrastTheme: { type: String, enum: ['standard', 'high_contrast'], default: 'standard' },
    largeText: { type: Boolean, default: false },
    createdAt: { type: String, default: () => new Date().toISOString() },
  },
  {
    collection: 'users',
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

export const UserModel = mongoose.models.User || mongoose.model<IUserDocument>('User', UserSchema);
