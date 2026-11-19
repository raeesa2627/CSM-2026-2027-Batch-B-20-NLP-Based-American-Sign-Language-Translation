import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import express from 'express';
import jwt from 'jsonwebtoken';
import { Server } from 'http';
import apiRouter from '../src/routes/apiRouter.js';
import { userRepository, historyRepository } from '../src/repositories/index.js';
import { aiClient } from '../src/services/aiClient.js';
import { config } from '../src/config/index.js';
import { IUser } from '../src/models/types.js';

describe('ASL Bridge AI: Translation History Persistence & Retrieval End-to-End', () => {
  let app: express.Express;
  let server: Server;
  let baseUrl: string;

  const testUser: IUser = {
    id: `test-auth-user-${Date.now()}`,
    email: `test-auth-${Date.now()}@example.com`,
    passwordHash: 'dummy_hashed_password',
    name: 'Accessibility Integration Tester',
    role: 'user',
    preferredMode: 'text',
    historyRetentionEnabled: true,
    contrastTheme: 'standard',
    largeText: false,
    createdAt: new Date().toISOString(),
  };

  const optedOutUser: IUser = {
    id: `test-optout-user-${Date.now()}`,
    email: `test-optout-${Date.now()}@example.com`,
    passwordHash: 'dummy_hashed_password',
    name: 'Privacy Conscious User',
    role: 'user',
    preferredMode: 'text',
    historyRetentionEnabled: false,
    contrastTheme: 'standard',
    largeText: false,
    createdAt: new Date().toISOString(),
  };

  let testUserToken: string;
  let optedOutUserToken: string;

  beforeAll(async () => {
    // 1. Create test users in repository
    await userRepository.create(testUser);
    await userRepository.create(optedOutUser);

    // 2. Generate authentication tokens
    testUserToken = jwt.sign(
      { id: testUser.id, email: testUser.email, role: testUser.role, name: testUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    optedOutUserToken = jwt.sign(
      { id: optedOutUser.id, email: optedOutUser.email, role: optedOutUser.role, name: optedOutUser.name },
      config.jwtSecret,
      { expiresIn: '1h' }
    );

    // 3. Mount API router on dynamic port
    app = express();
    app.use(express.json());
    app.use('/api', apiRouter);

    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const port = (server.address() as any).port;
        baseUrl = `http://127.0.0.1:${port}/api`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    // Clean up created history records for test users
    await historyRepository.clearByUserId(testUser.id);
    await historyRepository.clearByUserId(optedOutUser.id);
    if (server) {
      server.close();
    }
  });

  it('1. Persists translation history when an authenticated user performs text translation', async () => {
    // Mock or verify aiClient translation
    const spy = vi.spyOn(aiClient, 'translateText').mockResolvedValueOnce({
      request_id: 'req-test-101',
      original_text: 'Where is the hospital?',
      normalized_text: 'where is the hospital',
      tokens: ['where', 'is', 'the', 'hospital'],
      keywords: ['HOSPITAL', 'WHERE'],
      asl_gloss: 'HOSPITAL WHERE {q}',
      signs: [
        {
          gloss: 'HOSPITAL',
          media_url: '/media/asl/hospital.mp4',
          verified: true,
          is_fingerspelled: false,
          media_type: 'video',
        },
        {
          gloss: 'WHERE',
          media_url: '/media/asl/where.mp4',
          verified: true,
          is_fingerspelled: false,
          media_type: 'video',
        },
      ] as any,
      missing_vocabulary: [],
      fingerspelled_tokens: [],
      confidence: {
        overall_label: 'Verified vocabulary match',
        vocabulary_coverage: 1.0,
      } as any,
      retrieval_evidence: ['asl-hospital'],
      processing_method: 'rag_grounded_topic_comment',
      limitations_notice: 'Empirical gloss sequence',
      duration_ms: 12.5,
    });

    const res = await fetch(`${baseUrl}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${testUserToken}`,
      },
      body: JSON.stringify({
        text: 'Where is the hospital?',
        strategy: 'rag_grounded',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.data.asl_gloss).toBe('HOSPITAL WHERE {q}');
    expect(spy).toHaveBeenCalled();

    // Verify history document was persisted and can be retrieved via GET /api/history
    const histRes = await fetch(`${baseUrl}/history`, {
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });

    expect(histRes.status).toBe(200);
    const histBody = await histRes.json();
    expect(histBody.success).toBe(true);
    expect(histBody.total).toBe(1);
    expect(histBody.data.length).toBe(1);

    const saved = histBody.data[0];
    expect(saved.userId).toBe(testUser.id);
    expect(saved.inputText).toBe('Where is the hospital?');
    expect(saved.aslGloss).toBe('HOSPITAL WHERE {q}');
    expect(saved.inputType).toBe('text');
    expect(saved.strategy).toBe('rag_grounded_topic_comment');
    expect(saved.signsCount).toBe(2);
    expect(saved.coverage).toBe(1.0);
    expect(saved.overallLabel).toBe('Verified vocabulary match');
    expect(saved.durationMs).toBe(12.5);
  });

  it('2. Preserves guest privacy: unauthenticated translations succeed without writing history', async () => {
    vi.spyOn(aiClient, 'translateText').mockResolvedValueOnce({
      request_id: 'req-guest-102',
      original_text: 'Thank you very much',
      normalized_text: 'thank you very much',
      tokens: ['thank', 'you'],
      keywords: ['THANK-YOU'],
      asl_gloss: 'THANK-YOU',
      signs: [] as any,
      missing_vocabulary: [],
      fingerspelled_tokens: [],
      confidence: { overall_label: 'Processed', vocabulary_coverage: 1.0 } as any,
      retrieval_evidence: [],
      processing_method: 'rule_nlp',
      limitations_notice: '',
      duration_ms: 8.0,
    });

    // Unauthenticated request (no Authorization header)
    const res = await fetch(`${baseUrl}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: 'Thank you very much',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify testUser history count has NOT changed
    const histRes = await fetch(`${baseUrl}/history`, {
      headers: {
        Authorization: `Bearer ${testUserToken}`,
      },
    });
    const histBody = await histRes.json();
    expect(histBody.total).toBe(1); // Still 1 from test 1
  });

  it('3. Respects user privacy preference: does not persist history when historyRetentionEnabled is false', async () => {
    vi.spyOn(aiClient, 'translateText').mockResolvedValueOnce({
      request_id: 'req-optout-103',
      original_text: 'Private message',
      normalized_text: 'private message',
      tokens: ['private', 'message'],
      keywords: ['SECRET'],
      asl_gloss: 'SECRET',
      signs: [] as any,
      missing_vocabulary: [],
      fingerspelled_tokens: [],
      confidence: { overall_label: 'Processed', vocabulary_coverage: 1.0 } as any,
      retrieval_evidence: [],
      processing_method: 'rag_grounded',
      limitations_notice: '',
      duration_ms: 5.0,
    });

    const res = await fetch(`${baseUrl}/translate/text`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${optedOutUserToken}`,
      },
      body: JSON.stringify({
        text: 'Private message',
      }),
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // Verify history for opted-out user remains empty
    const histRes = await fetch(`${baseUrl}/history`, {
      headers: {
        Authorization: `Bearer ${optedOutUserToken}`,
      },
    });
    const histBody = await histRes.json();
    expect(histBody.total).toBe(0);
    expect(histBody.data.length).toBe(0);
  });

  it('4. Allows deleting an individual translation history record', async () => {
    const listBefore = await fetch(`${baseUrl}/history`, {
      headers: { Authorization: `Bearer ${testUserToken}` },
    });
    const listBody = await listBefore.json();
    const itemId = listBody.data[0].id;

    const delRes = await fetch(`${baseUrl}/history/${itemId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${testUserToken}` },
    });
    expect(delRes.status).toBe(200);
    const delBody = await delRes.json();
    expect(delBody.success).toBe(true);

    // Verify item is removed
    const listAfter = await fetch(`${baseUrl}/history`, {
      headers: { Authorization: `Bearer ${testUserToken}` },
    });
    const afterBody = await listAfter.json();
    expect(afterBody.total).toBe(0);
  });
});
