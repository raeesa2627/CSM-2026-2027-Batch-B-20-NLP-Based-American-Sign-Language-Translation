import mongoose from 'mongoose';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';
import { config } from './index.js';
import {
  UserModel,
  SavedPhraseModel,
  EvaluationRunModel,
  IUser,
  ISavedPhrase,
  IEvaluationRun,
} from '../models/index.js';

export let isMongoConnected = false;

export async function seedDatabaseIfEmpty(): Promise<void> {
  if (!isMongoConnected) return;

  try {
    // 1. Seed default accounts if users collection is empty
    const userCount = await UserModel.countDocuments();
    if (userCount === 0) {
      console.log('[Database] Seeding default demo and admin accounts to MongoDB...');
      const salt = bcrypt.genSaltSync(10);
      const demoUser: IUser = {
        id: 'user-demo-001',
        email: 'demo@aslbridge.ai',
        passwordHash: bcrypt.hashSync('password123', salt),
        name: 'Accessibility Researcher',
        role: 'user',
        preferredMode: 'text',
        historyRetentionEnabled: true,
        contrastTheme: 'standard',
        largeText: false,
        createdAt: new Date().toISOString(),
      };

      const adminUser: IUser = {
        id: 'user-admin-001',
        email: 'admin@aslbridge.ai',
        passwordHash: bcrypt.hashSync('admin123', salt),
        name: 'ASL Review Administrator',
        role: 'admin',
        preferredMode: 'text',
        historyRetentionEnabled: true,
        contrastTheme: 'standard',
        largeText: false,
        createdAt: new Date().toISOString(),
      };

      await UserModel.create([demoUser, adminUser]);
      console.log('[Database] Seeded 2 default user accounts to MongoDB.');
    }

    // 2. Seed default assistance phrases if collection is empty
    const phraseCount = await SavedPhraseModel.countDocuments();
    if (phraseCount === 0) {
      console.log('[Database] Seeding default assistance phrases to MongoDB...');
      const defaultPhrases: Array<Omit<ISavedPhrase, 'id' | 'createdAt'>> = [
        {
          userId: 'user-demo-001',
          englishText: 'Please help me, I need a doctor.',
          aslGloss: 'PLEASE HELP ME DOCTOR I NEED',
          category: 'medical',
          isFavorite: true,
        },
        {
          userId: 'user-demo-001',
          englishText: 'I need an ASL interpreter.',
          aslGloss: 'ASL INTERPRETER I NEED',
          category: 'assistance',
          isFavorite: true,
        },
        {
          userId: 'user-demo-001',
          englishText: 'Can you please write it down?',
          aslGloss: 'PLEASE WRITE YOU {yn_q}',
          category: 'assistance',
          isFavorite: true,
        },
        {
          userId: 'user-demo-001',
          englishText: 'Where is the bathroom?',
          aslGloss: 'BATHROOM WHERE {q}',
          category: 'questions',
          isFavorite: false,
        },
        {
          userId: 'user-demo-001',
          englishText: 'Hello, nice to meet you.',
          aslGloss: 'HELLO NICE MEET YOU',
          category: 'greetings',
          isFavorite: false,
        },
      ];

      const records = defaultPhrases.map((p, idx) => ({
        id: `phrase-default-${idx + 1}`,
        ...p,
        createdAt: new Date().toISOString(),
      }));

      await SavedPhraseModel.create(records);
      console.log(`[Database] Seeded ${records.length} default phrases to MongoDB.`);
    }

    // 3. Migrate latest_evaluation.json to MongoDB if evaluations collection is empty
    const evalCount = await EvaluationRunModel.countDocuments();
    if (evalCount === 0) {
      const evalPath = path.resolve(process.cwd(), '../datasets/latest_evaluation.json');
      const altEvalPath = path.resolve(process.cwd(), 'datasets/latest_evaluation.json');
      const targetEvalPath = fs.existsSync(evalPath) ? evalPath : altEvalPath;

      if (fs.existsSync(targetEvalPath)) {
        console.log(`[Database] Migrating existing benchmark evaluation from ${targetEvalPath} to MongoDB...`);
        const rawEval = fs.readFileSync(targetEvalPath, 'utf-8');
        const runRecord: IEvaluationRun = JSON.parse(rawEval);
        if (runRecord && runRecord.id) {
          await EvaluationRunModel.create(runRecord);
          console.log(`[Database] Successfully migrated evaluation run ${runRecord.id} into MongoDB evaluations collection.`);
        }
      }
    }
  } catch (err: any) {
    console.warn('[Database] Seed/migration check encountered a non-fatal warning:', err.message);
  }
}

export async function connectDatabase(): Promise<boolean> {
  try {
    mongoose.set('strictQuery', false);
    // Explicitly configure asl_bridge_ai database name while preserving URI credentials
    const conn = await mongoose.connect(config.mongoUri, {
      dbName: 'asl_bridge_ai',
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    isMongoConnected = true;
    console.log(`[Database] MongoDB connected successfully to: ${conn.connection.host}/${conn.connection.name}`);
    await seedDatabaseIfEmpty();
    return true;
  } catch (error: any) {
    isMongoConnected = false;
    if (config.nodeEnv === 'production') {
      console.error(`[Database] FATAL: MongoDB connection failed in production mode (${error.message}). Refusing silent in-memory fallback.`);
      throw new Error(`MongoDB connection failed in production: ${error.message}`);
    }
    console.warn(`[Database] WARNING: MongoDB connection unavailable (${error.message}).`);
    console.warn(`[Database] Operating in explicit development in-memory repository fallback mode.`);
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (isMongoConnected) {
    await mongoose.disconnect();
    isMongoConnected = false;
  }
}
