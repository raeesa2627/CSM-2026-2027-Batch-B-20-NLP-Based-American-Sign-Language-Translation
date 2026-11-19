import { Response } from 'express';
import { AuthRequest } from '../middleware/auth.js';
import { historyRepository } from '../repositories/index.js';

export const historyController = {
  async getHistory(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required to access history.' });
    }

    const { page = '1', limit = '20' } = req.query;
    const p = Math.max(1, parseInt(page as string, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));

    const { items, total } = await historyRepository.findByUserId(req.user.id, p, l);

    return res.json({
      success: true,
      total,
      page: p,
      limit: l,
      data: items,
    });
  },

  async deleteItem(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const { id } = req.params;
    const item = await historyRepository.findById(id);
    if (!item) {
      return res.status(404).json({ success: false, error: 'History item not found.' });
    }

    if (item.userId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Unauthorized.' });
    }

    await historyRepository.deleteById(id, req.user.id);
    return res.json({ success: true, message: 'History record deleted.' });
  },

  async clearHistory(req: AuthRequest, res: Response) {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'Authentication required.' });
    }

    const deletedCount = await historyRepository.clearByUserId(req.user.id);
    return res.json({ success: true, message: `Purged ${deletedCount} history entries.` });
  },
};
