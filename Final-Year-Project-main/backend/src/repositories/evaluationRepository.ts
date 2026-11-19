import fs from 'fs';
import path from 'path';
import { EvaluationRunModel, IEvaluationRun } from '../models/index.js';
import { isMongoConnected } from '../config/db.js';
import { store } from '../services/store.js';

function getDiskEvaluationPath(): { targetPath: string; targetDir: string } {
  const evalPath = path.resolve(process.cwd(), '../datasets/latest_evaluation.json');
  const altEvalPath = path.resolve(process.cwd(), 'datasets/latest_evaluation.json');
  const targetDir = fs.existsSync(path.dirname(evalPath)) ? path.dirname(evalPath) : path.dirname(altEvalPath);
  const targetPath = path.join(targetDir, 'latest_evaluation.json');
  return { targetPath, targetDir };
}

export const evaluationRepository = {
  async getLatest(): Promise<IEvaluationRun | null> {
    if (isMongoConnected) {
      const doc = await EvaluationRunModel.findOne().sort({ createdAt: -1 }).lean<IEvaluationRun>();
      if (doc) {
        store.evaluations.set(doc.id, doc);
        return doc;
      }
    }

    // Fallback: in-memory cache
    if (store.evaluations.size > 0) {
      return Array.from(store.evaluations.values())[store.evaluations.size - 1];
    }

    // Fallback: local disk file
    try {
      const { targetPath } = getDiskEvaluationPath();
      if (fs.existsSync(targetPath)) {
        const raw = fs.readFileSync(targetPath, 'utf-8');
        const parsed: IEvaluationRun = JSON.parse(raw);
        if (parsed && parsed.id) {
          store.evaluations.set(parsed.id, parsed);
          // If MongoDB is connected but had 0 records, persist this file record now
          if (isMongoConnected) {
            await EvaluationRunModel.create(parsed).catch(() => {});
          }
          return parsed;
        }
      }
    } catch (err: any) {
      console.warn('[EvaluationRepository] Failed reading disk evaluation fallback:', err.message);
    }

    return null;
  },

  async save(runRecord: IEvaluationRun): Promise<IEvaluationRun> {
    if (isMongoConnected) {
      await EvaluationRunModel.create(runRecord);
    }
    store.evaluations.set(runRecord.id, runRecord);

    // Keep latest_evaluation.json updated for disk compatibility
    try {
      const { targetPath } = getDiskEvaluationPath();
      fs.writeFileSync(targetPath, JSON.stringify(runRecord, null, 2), 'utf-8');
    } catch (err: any) {
      console.warn('[EvaluationRepository] Failed writing latest_evaluation.json to disk:', err.message);
    }

    return runRecord;
  },
};
