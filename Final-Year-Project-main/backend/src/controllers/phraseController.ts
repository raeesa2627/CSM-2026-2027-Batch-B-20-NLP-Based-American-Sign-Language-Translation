import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { phraseRepository } from '../repositories/index.js';
import { ISavedPhrase } from '../models/types.js';

export const phraseController = {
  async getPhrases(req: AuthRequest, res: Response) {
    const userId = req.user?.id;
    const phrases = await phraseRepository.findAccessible(userId);

    return res.json({
      success: true,
      total: phrases.length,
      data: phrases,
    });
  },

  async createPhrase(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required to save phrases.' });
    }

    const { englishText, aslGloss, category, isFavorite } = req.body;
    if (!englishText || !aslGloss) {
      return res.status(400).json({ success: false, error: 'English text and ASL gloss are required.' });
    }

    const id = `phrase-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`;
    const newPhrase: ISavedPhrase = {
      id,
      userId: req.user.id,
      englishText: englishText.trim(),
      aslGloss: aslGloss.trim(),
      category: category || 'custom',
      isFavorite: isFavorite ?? false,
      createdAt: new Date().toISOString(),
    };

    const saved = await phraseRepository.create(newPhrase);
    return res.status(201).json({ success: true, data: saved });
  },

  async deletePhrase(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const phrase = await phraseRepository.findById(id);
    if (!phrase) {
      return res.status(404).json({ success: false, error: 'Phrase not found.' });
    }

    const isAdmin = req.user.role === 'admin';
    if (phrase.userId !== req.user.id && !isAdmin) {
      return res.status(403).json({ success: false, error: 'Unauthorized to delete this phrase.' });
    }

    await phraseRepository.deleteById(id, req.user.id, isAdmin);
    return res.json({ success: true, message: 'Phrase removed.' });
  },
};
