import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { feedbackRepository } from '../repositories/index.js';
import { IFeedback } from '../models/types.js';

export const feedbackController = {
  async submitFeedback(req: AuthRequest, res: Response) {
    const { requestId, inputText, aslGloss, issueCategory, comments } = req.body;

    if (!inputText || !issueCategory) {
      return res.status(400).json({ success: false, error: 'Input text and issue category are required.' });
    }

    const id = `fb-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const feedbackItem: IFeedback = {
      id,
      userId: req.user?.id,
      requestId: requestId || 'untracked',
      inputText: inputText.trim(),
      aslGloss: aslGloss || '',
      issueCategory,
      comments: comments ? comments.trim() : '',
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    const saved = await feedbackRepository.create(feedbackItem);
    return res.status(201).json({
      success: true,
      message: 'Feedback recorded for linguistic review. Thank you for improving ASL Bridge AI.',
      data: saved,
    });
  },

  async getFeedback(req: AuthRequest, res: Response) {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ success: false, error: 'Admin privileges required.' });
    }

    const items = await feedbackRepository.findAll();

    return res.json({
      success: true,
      total: items.length,
      data: items,
    });
  },
};
