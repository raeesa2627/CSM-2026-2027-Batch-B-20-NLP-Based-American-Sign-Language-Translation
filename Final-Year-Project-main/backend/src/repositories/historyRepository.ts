import { TranslationHistoryModel, ITranslationHistory } from '../models/index.js';
import { isMongoConnected } from '../config/db.js';
import { store } from '../services/store.js';

export const historyRepository = {
  async create(item: ITranslationHistory): Promise<ITranslationHistory> {
    if (isMongoConnected) {
      const created = await TranslationHistoryModel.create(item);
      const plain = created.toJSON() as ITranslationHistory;
      store.history.set(item.id, plain);
      return plain;
    }
    store.history.set(item.id, item);
    return item;
  },

  async findByUserId(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ items: ITranslationHistory[]; total: number }> {
    if (isMongoConnected) {
      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        TranslationHistoryModel.find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean<ITranslationHistory[]>(),
        TranslationHistoryModel.countDocuments({ userId }),
      ]);
      return { items, total };
    }

    const all = Array.from(store.history.values())
      .filter(h => h.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    const startIndex = (page - 1) * limit;
    return {
      items: all.slice(startIndex, startIndex + limit),
      total: all.length,
    };
  },

  async findById(id: string): Promise<ITranslationHistory | null> {
    if (isMongoConnected) {
      const doc = await TranslationHistoryModel.findOne({ id }).lean<ITranslationHistory>();
      if (doc) return doc;
    }
    return store.history.get(id) || null;
  },

  async deleteById(id: string, userId: string): Promise<boolean> {
    if (isMongoConnected) {
      const res = await TranslationHistoryModel.deleteOne({ id, userId });
      store.history.delete(id);
      return res.deletedCount > 0;
    }
    const item = store.history.get(id);
    if (item && item.userId === userId) {
      store.history.delete(id);
      return true;
    }
    return false;
  },

  async clearByUserId(userId: string): Promise<number> {
    if (isMongoConnected) {
      const res = await TranslationHistoryModel.deleteMany({ userId });
      for (const [id, item] of store.history.entries()) {
        if (item.userId === userId) store.history.delete(id);
      }
      return res.deletedCount;
    }
    let count = 0;
    for (const [id, item] of store.history.entries()) {
      if (item.userId === userId) {
        store.history.delete(id);
        count++;
      }
    }
    return count;
  },
};
