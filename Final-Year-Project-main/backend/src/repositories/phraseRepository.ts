import { SavedPhraseModel, ISavedPhrase } from '../models/index.js';
import { isMongoConnected } from '../config/db.js';
import { store } from '../services/store.js';

export const phraseRepository = {
  async findAccessible(userId?: string): Promise<ISavedPhrase[]> {
    if (isMongoConnected) {
      const query = userId
        ? { $or: [{ userId }, { userId: 'user-demo-001' }] }
        : { userId: 'user-demo-001' };
      return SavedPhraseModel.find(query).sort({ createdAt: -1 }).lean<ISavedPhrase[]>();
    }

    const all = Array.from(store.phrases.values());
    return all.filter(p => !userId || p.userId === userId || p.userId === 'user-demo-001');
  },

  async findById(id: string): Promise<ISavedPhrase | null> {
    if (isMongoConnected) {
      const doc = await SavedPhraseModel.findOne({ id }).lean<ISavedPhrase>();
      if (doc) return doc;
    }
    return store.phrases.get(id) || null;
  },

  async create(phrase: ISavedPhrase): Promise<ISavedPhrase> {
    if (isMongoConnected) {
      const created = await SavedPhraseModel.create(phrase);
      const plain = created.toJSON() as ISavedPhrase;
      store.phrases.set(phrase.id, plain);
      return plain;
    }
    store.phrases.set(phrase.id, phrase);
    return phrase;
  },

  async deleteById(id: string, userId: string, isAdmin: boolean = false): Promise<boolean> {
    if (isMongoConnected) {
      const filter = isAdmin ? { id } : { id, userId };
      const res = await SavedPhraseModel.deleteOne(filter);
      store.phrases.delete(id);
      return res.deletedCount > 0;
    }

    const item = store.phrases.get(id);
    if (!item) return false;
    if (item.userId !== userId && !isAdmin) return false;
    store.phrases.delete(id);
    return true;
  },
};
