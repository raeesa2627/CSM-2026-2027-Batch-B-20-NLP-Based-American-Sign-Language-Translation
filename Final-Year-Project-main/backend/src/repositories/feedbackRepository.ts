import { FeedbackModel, IFeedback } from '../models/index.js';
import { isMongoConnected } from '../config/db.js';
import { store } from '../services/store.js';

export const feedbackRepository = {
  async create(feedback: IFeedback): Promise<IFeedback> {
    if (isMongoConnected) {
      const created = await FeedbackModel.create(feedback);
      const plain = created.toJSON() as IFeedback;
      store.feedback.set(feedback.id, plain);
      return plain;
    }
    store.feedback.set(feedback.id, feedback);
    return feedback;
  },

  async findAll(): Promise<IFeedback[]> {
    if (isMongoConnected) {
      return FeedbackModel.find().sort({ createdAt: -1 }).lean<IFeedback[]>();
    }
    return Array.from(store.feedback.values()).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },
};
