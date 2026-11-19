import { Response } from 'express';
import { aiClient } from '../services/aiClient.js';
import { userRepository, historyRepository } from '../repositories/index.js';
import { AuthRequest } from '../middleware/auth.js';
import { ITranslationHistory } from '../models/types.js';

interface PersistHistoryParams {
  inputType: 'text' | 'speech' | 'image';
  inputText: string;
  strategy?: string;
  aslGloss: string;
  signsCount?: number;
  coverage?: number;
  overallLabel?: string;
  durationMs?: number;
}

/**
 * Persists translation history for authenticated users who have retention enabled.
 * Guest translations are intentionally ephemeral to protect privacy and prevent anonymous database bloat.
 * Database persistence errors are logged transparently and not silently swallowed.
 */
async function recordTranslationHistory(
  req: AuthRequest,
  params: PersistHistoryParams
): Promise<ITranslationHistory | null> {
  if (!req.user || !req.user.id) {
    // Unauthenticated guest translation: ephemeral by design
    return null;
  }

  try {
    const user = await userRepository.findById(req.user.id);
    // User retention defaults to true unless explicitly disabled (false)
    const retentionEnabled = user ? user.historyRetentionEnabled !== false : true;
    if (!retentionEnabled) {
      return null;
    }

    const historyItem: ITranslationHistory = {
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
      userId: req.user.id,
      inputType: params.inputType,
      inputText: params.inputText,
      strategy: params.strategy || 'rag_grounded',
      aslGloss: params.aslGloss,
      signsCount: params.signsCount ?? 0,
      coverage: params.coverage ?? 1.0,
      overallLabel: params.overallLabel || 'Processed',
      durationMs: params.durationMs ?? 0,
      createdAt: new Date().toISOString(),
    };

    return await historyRepository.create(historyItem);
  } catch (err: any) {
    console.error(`[History Persistence Error] Failed to persist ${params.inputType} translation history for user ${req.user.id}:`, err);
    return null;
  }
}

export const translationController = {
  async translateText(req: AuthRequest, res: Response) {
    try {
      const { text, strategy } = req.body;
      if (!text || typeof text !== 'string' || !text.trim()) {
        return res.status(400).json({ success: false, error: 'Text input must not be empty.' });
      }

      const result = await aiClient.translateText(text.trim(), strategy || 'rag_grounded');

      // Record in history if user is authenticated and opted in
      await recordTranslationHistory(req, {
        inputType: 'text',
        inputText: text.trim(),
        strategy: result.processing_method,
        aslGloss: result.asl_gloss,
        signsCount: result.signs ? result.signs.length : 0,
        coverage: result.confidence?.vocabulary_coverage ?? 1.0,
        overallLabel: result.confidence?.overall_label ?? 'Processed',
        durationMs: result.duration_ms ?? 0,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[Translation API Error]', err.message);
      return res.status(502).json({
        success: false,
        error: 'AI translation microservice unavailable or processing failed.',
        details: err.message,
      });
    }
  },

  async translateSpeech(req: AuthRequest, res: Response) {
    try {
      const { transcript, audioConfidence, strategy } = req.body;
      if (!transcript || typeof transcript !== 'string' || !transcript.trim()) {
        return res.status(400).json({ success: false, error: 'Speech transcript must not be empty.' });
      }

      const result = await aiClient.translateTranscript(
        transcript.trim(),
        audioConfidence,
        strategy || 'rag_grounded'
      );

      await recordTranslationHistory(req, {
        inputType: 'speech',
        inputText: transcript.trim(),
        strategy: result.processing_method,
        aslGloss: result.asl_gloss,
        signsCount: result.signs ? result.signs.length : 0,
        coverage: result.confidence?.vocabulary_coverage ?? 1.0,
        overallLabel: result.confidence?.overall_label ?? 'Processed',
        durationMs: result.duration_ms ?? 0,
      });

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[Speech Translation Error]', err.message);
      return res.status(502).json({
        success: false,
        error: 'Failed to process speech transcript.',
        details: err.message,
      });
    }
  },

  async transcribeSpeech(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No audio file uploaded.' });
      }

      const result = await aiClient.transcribeSpeech(
        req.file.buffer,
        req.file.originalname || 'speech.wav',
        req.file.mimetype || 'audio/wav'
      );

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[Speech Transcription Error]', err.message);
      return res.status(502).json({
        success: false,
        error: 'Failed to transcribe speech audio.',
        details: err.message,
      });
    }
  },

  async translateImage(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No image file uploaded.' });
      }

      const strategy = (req.body.strategy as string) || 'rag_grounded';
      const result = await aiClient.translateImage(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        strategy
      );

      if (result.translation) {
        await recordTranslationHistory(req, {
          inputType: 'image',
          inputText: result.ocr_result?.extracted_text || 'Image text',
          strategy: result.translation.processing_method,
          aslGloss: result.translation.asl_gloss,
          signsCount: result.translation.signs ? result.translation.signs.length : 0,
          coverage: result.translation.confidence?.vocabulary_coverage ?? 1.0,
          overallLabel: result.translation.confidence?.overall_label ?? 'OCR Translated',
          durationMs: result.translation.duration_ms ?? 0,
        });
      }

      return res.json({
        success: true,
        data: result,
      });
    } catch (err: any) {
      console.error('[Image OCR Translation Error]', err.message);
      return res.status(502).json({
        success: false,
        error: 'Failed to process image OCR or translation.',
        details: err.message,
      });
    }
  },
};
