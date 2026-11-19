import { Request, Response } from 'express';
import { aiClient } from '../services/aiClient.js';
import { evaluationRepository } from '../repositories/index.js';
import { IEvaluationRun } from '../models/types.js';

export const researchController = {
  async getEvaluation(req: Request, res: Response) {
    try {
      const { forceFresh } = req.query;

      // Check if we have an existing evaluation run in MongoDB / disk cache
      if (!forceFresh) {
        const latest = await evaluationRepository.getLatest();
        if (latest) {
          return res.json({ success: true, data: latest });
        }
      }

      // Run live evaluation benchmark via FastAPI AI service
      const evalData = await aiClient.runEvaluation();
      const id = `eval-run-${Date.now()}`;
      const runRecord: IEvaluationRun = {
        id,
        datasetName: evalData.dataset_name || 'core_asl_bench_v1',
        strategies: ['baseline_lexical', 'rule_nlp', 'rag_grounded'],
        results: evalData.results,
        summaryAnalysis: evalData.summary_analysis,
        createdAt: evalData.evaluated_at || new Date().toISOString(),
        metricEngine: evalData.metric_engine || 'sacrebleu-v2.6',
        metricSignature: evalData.metric_signature,
      };

      // Persists to MongoDB and writes to datasets/latest_evaluation.json
      const saved = await evaluationRepository.save(runRecord);

      return res.json({ success: true, data: saved });
    } catch (err: any) {
      console.error('[Research Evaluation Error]', err.message);
      return res.status(502).json({
        success: false,
        error: 'Failed to run research evaluation.',
        details: err.message,
      });
    }
  },
};
