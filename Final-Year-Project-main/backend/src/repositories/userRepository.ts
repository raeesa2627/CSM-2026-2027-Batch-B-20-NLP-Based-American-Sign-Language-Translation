import { UserModel, IUser } from '../models/index.js';
import { isMongoConnected } from '../config/db.js';
import { store } from '../services/store.js';

export const userRepository = {
  async findByEmail(email: string): Promise<IUser | null> {
    const cleanEmail = email.toLowerCase().trim();
    if (isMongoConnected) {
      const doc = await UserModel.findOne({ email: cleanEmail }).lean<IUser>();
      if (doc) return doc;
    }
    // Development fallback
    return Array.from(store.users.values()).find(u => u.email.toLowerCase() === cleanEmail) || null;
  },

  async findById(id: string): Promise<IUser | null> {
    if (isMongoConnected) {
      const doc = await UserModel.findOne({ id }).lean<IUser>();
      if (doc) return doc;
    }
    return store.users.get(id) || null;
  },

  async create(user: IUser): Promise<IUser> {
    if (isMongoConnected) {
      const created = await UserModel.create(user);
      const plain = created.toJSON() as IUser;
      // Mirror to in-memory store for cache consistency
      store.users.set(user.id, plain);
      return plain;
    }
    store.users.set(user.id, user);
    return user;
  },

  async update(id: string, updates: Partial<IUser>): Promise<IUser | null> {
    if (isMongoConnected) {
      const updated = await UserModel.findOneAndUpdate(
        { id },
        { $set: updates },
        { new: true, runValidators: true }
      ).lean<IUser>();
      if (updated) {
        store.users.set(id, updated);
        return updated;
      }
    }
    const memUser = store.users.get(id);
    if (!memUser) return null;
    const merged = { ...memUser, ...updates };
    store.users.set(id, merged);
    return merged;
  },
};
