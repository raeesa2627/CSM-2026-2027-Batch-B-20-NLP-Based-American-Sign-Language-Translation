import mongoose, { Schema, Document } from 'mongoose';
import { IEvaluationRun } from './types.js';

export interface IEvaluationRunDocument extends Omit<IEvaluationRun, 'id'>, Document {
  id: string;
}

const EvaluationRunSchema = new Schema<IEvaluationRunDocument>(
  {
    id: { type: String, required: true, unique: true, index: true },
    datasetName: { type: String, default: 'core_asl_bench_v1' },
    strategies: [{ type: String }],
    results: [{ type: Schema.Types.Mixed }],
    summaryAnalysis: { type: String, default: '' },
    createdAt: { type: String, default: () => new Date().toISOString(), index: true },
    metricEngine: { type: String, default: 'sacrebleu-v2.6' },
    metricSignature: { type: Schema.Types.Mixed },
  },
  {
    collection: 'evaluations',
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

export const EvaluationRunModel =
  mongoose.models.EvaluationRun || mongoose.model<IEvaluationRunDocument>('EvaluationRun', EvaluationRunSchema);
