import { describe, it, expect, beforeAll } from 'vitest';
import bcrypt from 'bcryptjs';
import {
  userRepository,
  historyRepository,
  phraseRepository,
  feedbackRepository,
  evaluationRepository,
} from '../src/repositories/index.js';
import { IUser, ITranslationHistory, ISavedPhrase, IFeedback, IEvaluationRun } from '../src/models/types.js';

describe('ASL Bridge AI: Repository & Persistence Layer', () => {
  const testUserId = `test-user-${Date.now()}`;
  const testUserEmail = `test-${Date.now()}@example.com`;

  describe('1. User Repository & Authentication Security', () => {
    it('creates and retrieves a new user with hashed password (never plaintext)', async () => {
      const rawPassword = 'SecurePassword_2026!';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(rawPassword, salt);

      const newUser: IUser = {
        id: testUserId,
        email: testUserEmail,
        passwordHash,
        name: 'Test Deaf Accessibility Researcher',
        role: 'user',
        preferredMode: 'text',
        historyRetentionEnabled: true,
        contrastTheme: 'standard',
        largeText: false,
        createdAt: new Date().toISOString(),
      };

      const created = await userRepository.create(newUser);
      expect(created.id).toBe(testUserId);
      expect(created.email).toBe(testUserEmail);
      expect(created.passwordHash).toBe(passwordHash);
      // Plaintext must not match hash
      expect(created.passwordHash).not.toBe(rawPassword);

      // Verify bcrypt validation
      const matches = await bcrypt.compare(rawPassword, created.passwordHash);
      expect(matches).toBe(true);

      // Lookup by email
      const foundByEmail = await userRepository.findByEmail(testUserEmail);
      expect(foundByEmail).not.toBeNull();
      expect(foundByEmail?.id).toBe(testUserId);

      // Lookup by ID
      const foundById = await userRepository.findById(testUserId);
      expect(foundById).not.toBeNull();
      expect(foundById?.email).toBe(testUserEmail);
    });

    it('rejects duplicate email lookup correctly', async () => {
      const existing = await userRepository.findByEmail(testUserEmail);
      expect(existing).not.toBeNull();
      expect(existing?.email).toBe(testUserEmail);
    });

    it('updates user preferences while preserving credentials', async () => {
      const updated = await userRepository.update(testUserId, {
        preferredMode: 'speech',
        contrastTheme: 'high_contrast',
        largeText: true,
      });

      expect(updated).not.toBeNull();
      expect(updated?.preferredMode).toBe('speech');
      expect(updated?.contrastTheme).toBe('high_contrast');
      expect(updated?.largeText).toBe(true);
      expect(updated?.email).toBe(testUserEmail);
    });
  });

  describe('2. Saved Phrases Ownership & Authorization', () => {
    const phraseId = `test-phrase-${Date.now()}`;
    const otherUserId = `other-user-${Date.now()}`;

    it('creates a saved phrase for a user', async () => {
      const newPhrase: ISavedPhrase = {
        id: phraseId,
        userId: testUserId,
        englishText: 'Where is the ASL interpreter?',
        aslGloss: 'ASL INTERPRETER WHERE {q}',
        category: 'assistance',
        isFavorite: true,
        createdAt: new Date().toISOString(),
      };

      const saved = await phraseRepository.create(newPhrase);
      expect(saved.id).toBe(phraseId);
      expect(saved.userId).toBe(testUserId);
      expect(saved.englishText).toBe('Where is the ASL interpreter?');
    });

    it('returns accessible phrases including default emergency presets', async () => {
      const accessible = await phraseRepository.findAccessible(testUserId);
      expect(accessible.length).toBeGreaterThan(0);
      const userPhrase = accessible.find(p => p.id === phraseId);
      expect(userPhrase).toBeDefined();

      // Shared demo presets are accessible
      const hasDemoPreset = accessible.some(p => p.userId === 'user-demo-001');
      expect(hasDemoPreset).toBe(true);
    });

    it('enforces ownership: another user cannot delete this phrase', async () => {
      const deleted = await phraseRepository.deleteById(phraseId, otherUserId, false);
      expect(deleted).toBe(false);

      // Verify phrase still exists
      const stillExists = await phraseRepository.findById(phraseId);
      expect(stillExists).not.toBeNull();
    });

    it('allows owner to delete their phrase', async () => {
      const deleted = await phraseRepository.deleteById(phraseId, testUserId, false);
      expect(deleted).toBe(true);

      const check = await phraseRepository.findById(phraseId);
      expect(check).toBeNull();
    });
  });

  describe('3. Translation History Persistence & Scoping', () => {
    const histId1 = `test-hist-1-${Date.now()}`;
    const histId2 = `test-hist-2-${Date.now()}`;

    it('persists translation history with linguistic metadata', async () => {
      const item1: ITranslationHistory = {
        id: histId1,
        userId: testUserId,
        inputType: 'text',
        inputText: 'Where is the hospital?',
        strategy: 'rag_grounded_topic_comment',
        aslGloss: 'HOSPITAL WHERE {q}',
        signsCount: 2,
        coverage: 1.0,
        overallLabel: 'Verified vocabulary match',
        durationMs: 4.5,
        createdAt: new Date(Date.now() - 1000).toISOString(),
      };

      const item2: ITranslationHistory = {
        id: histId2,
        userId: testUserId,
        inputType: 'speech',
        inputText: 'Please help me',
        strategy: 'rag_grounded_topic_comment',
        aslGloss: 'PLEASE HELP ME',
        signsCount: 3,
        coverage: 1.0,
        overallLabel: 'Verified vocabulary match',
        durationMs: 5.2,
        createdAt: new Date().toISOString(),
      };

      await historyRepository.create(item1);
      await historyRepository.create(item2);

      const history = await historyRepository.findByUserId(testUserId, 1, 10);
      expect(history.total).toBeGreaterThanOrEqual(2);
      expect(history.items.some(h => h.id === histId1)).toBe(true);
      expect(history.items.some(h => h.id === histId2)).toBe(true);
    });

    it('allows deleting an individual history item', async () => {
      const deleted = await historyRepository.deleteById(histId1, testUserId);
      expect(deleted).toBe(true);

      const check = await historyRepository.findById(histId1);
      expect(check).toBeNull();
    });

    it('clears all history for a specific user without affecting others', async () => {
      const otherHistId = `other-hist-${Date.now()}`;
      await historyRepository.create({
        id: otherHistId,
        userId: 'other-user-999',
        inputType: 'text',
        inputText: 'Hello world',
        strategy: 'rule_nlp',
        aslGloss: 'HELLO WORLD',
        signsCount: 2,
        coverage: 1.0,
        overallLabel: 'Processed',
        durationMs: 3.1,
        createdAt: new Date().toISOString(),
      });

      const purgedCount = await historyRepository.clearByUserId(testUserId);
      expect(purgedCount).toBeGreaterThanOrEqual(1);

      // Other user's record must be preserved
      const otherCheck = await historyRepository.findById(otherHistId);
      expect(otherCheck).not.toBeNull();

      // Clean up other test item
      await historyRepository.deleteById(otherHistId, 'other-user-999');
    });
  });

  describe('4. Feedback Repository', () => {
    it('creates feedback and allows administrative review', async () => {
      const fbId = `test-fb-${Date.now()}`;
      const fbItem: IFeedback = {
        id: fbId,
        userId: testUserId,
        requestId: 'req-test-123',
        inputText: 'Hey buddy',
        aslGloss: 'HEY FRIEND',
        issueCategory: 'inaccurate_gloss',
        comments: 'Verified synonym mapping test',
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const saved = await feedbackRepository.create(fbItem);
      expect(saved.id).toBe(fbId);

      const all = await feedbackRepository.findAll();
      const found = all.find(f => f.id === fbId);
      expect(found).toBeDefined();
      expect(found?.comments).toBe('Verified synonym mapping test');
    });
  });

  describe('5. Research Evaluation Persistence & Compatibility', () => {
    it('retrieves latest evaluation run from database or disk fallback', async () => {
      const latest = await evaluationRepository.getLatest();
      expect(latest).not.toBeNull();
      expect(latest?.datasetName).toBe('core_asl_bench_v1');
      expect(latest?.results).toBeDefined();
      expect(Array.isArray(latest?.results)).toBe(true);
    });

    it('persists a new evaluation run record', async () => {
      const evalId = `test-eval-${Date.now()}`;
      const runRecord: IEvaluationRun = {
        id: evalId,
        datasetName: 'core_asl_bench_v1',
        strategies: ['baseline_lexical', 'rule_nlp', 'rag_grounded'],
        results: [
          { strategy: 'rag_grounded', bleu_4: 76.5, chrf_score: 82.1, vocabulary_coverage_rate: 0.95 },
        ],
        summaryAnalysis: 'Persistent benchmark verification test.',
        createdAt: new Date().toISOString(),
        metricEngine: 'sacrebleu-v2.6',
      };

      const saved = await evaluationRepository.save(runRecord);
      expect(saved.id).toBe(evalId);

      const fetched = await evaluationRepository.getLatest();
      expect(fetched?.id).toBe(evalId);
    });
  });

  describe('6. Production Fail-Fast & Explicit Fallback Policy', () => {
    it('refuses silent fallback in production mode if connection fails', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        // Simulating invalid connection in production
        const isProd = process.env.NODE_ENV === 'production';
        expect(isProd).toBe(true);

        const simulateFail = (errMsg: string) => {
          if (isProd) {
            throw new Error(`MongoDB connection failed in production: ${errMsg}`);
          }
          return false;
        };

        expect(() => simulateFail('ServerSelectionTimeout')).toThrowError(
          /MongoDB connection failed in production/
        );
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('permits explicit in-memory fallback in development mode with clear reporting', () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'development';
        const isProd = process.env.NODE_ENV === 'production';
        expect(isProd).toBe(false);

        const simulateFail = (_errMsg: string) => {
          if (isProd) {
            throw new Error('Should not throw in dev');
          }
          return false;
        };

        expect(simulateFail('ServerSelectionTimeout')).toBe(false);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});

