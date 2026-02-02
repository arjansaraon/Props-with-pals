import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, props, participants } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { createPropHandler, type Database } from './route';

// Helper to create a mock POST Request
function createRequest(code: string, secret: string, body: unknown) {
  return new Request(`http://localhost:3000/api/pools/${code}/props?secret=${secret}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/pools/[code]/props', () => {
  let db: Database;
  let cleanup: () => void;

  beforeEach(async () => {
    const setup = await setupTestDb();
    db = setup.db as Database;
    cleanup = setup.cleanup;
  });

  afterEach(() => {
    cleanup?.();
  });

  // Helper to create a test pool
  async function createTestPool(overrides: Partial<typeof pools.$inferInsert> = {}) {
    const now = new Date().toISOString();
    const poolData = {
      id: crypto.randomUUID(),
      name: 'Test Pool',
      inviteCode: 'PROP01',
      captainName: 'Captain',
      captainSecret: crypto.randomUUID(),
      status: 'open' as const,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    await db.insert(pools).values(poolData);
    return poolData;
  }

  describe('Happy Path', () => {
    it('creates prop with valid input', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP02' });

      const response = await createPropHandler(
        createRequest('PROP02', pool.captainSecret, {
          questionText: 'Who will win?',
          options: ['Team A', 'Team B'],
          pointValue: 10,
        }),
        'PROP02',
        db
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.questionText).toBe('Who will win?');
      expect(data.options).toEqual(['Team A', 'Team B']);
      expect(data.pointValue).toBe(10);
    });

    it('returns prop id as UUID', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP03' });

      const response = await createPropHandler(
        createRequest('PROP03', pool.captainSecret, {
          questionText: 'Who scores first?',
          options: ['Player A', 'Player B'],
          pointValue: 5,
        }),
        'PROP03',
        db
      );

      const data = await response.json();
      expect(data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('sets status to active', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP04' });

      const response = await createPropHandler(
        createRequest('PROP04', pool.captainSecret, {
          questionText: 'Test question',
          options: ['A', 'B'],
          pointValue: 10,
        }),
        'PROP04',
        db
      );

      const data = await response.json();
      expect(data.status).toBe('active');
    });

    it('sets order to 0 for first prop', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP05' });

      const response = await createPropHandler(
        createRequest('PROP05', pool.captainSecret, {
          questionText: 'First prop',
          options: ['A', 'B'],
          pointValue: 10,
        }),
        'PROP05',
        db
      );

      const data = await response.json();
      expect(data.order).toBe(0);
    });

    it('auto-increments order for subsequent props', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP06' });

      // Create first prop
      await createPropHandler(
        createRequest('PROP06', pool.captainSecret, {
          questionText: 'First prop',
          options: ['A', 'B'],
          pointValue: 10,
        }),
        'PROP06',
        db
      );

      // Create second prop
      const response = await createPropHandler(
        createRequest('PROP06', pool.captainSecret, {
          questionText: 'Second prop',
          options: ['A', 'B'],
          pointValue: 10,
        }),
        'PROP06',
        db
      );

      const data = await response.json();
      expect(data.order).toBe(1);
    });

    it('accepts optional category', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP07' });

      const response = await createPropHandler(
        createRequest('PROP07', pool.captainSecret, {
          questionText: 'First TD scorer?',
          options: ['Player A', 'Player B', 'Other'],
          pointValue: 15,
          category: '1st Quarter',
        }),
        'PROP07',
        db
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.category).toBe('1st Quarter');
    });
  });

  describe('Authorization', () => {
    it('rejects wrong captain_secret (401)', async () => {
      await createTestPool({ inviteCode: 'PROP08' });

      const response = await createPropHandler(
        createRequest('PROP08', 'wrong-secret', {
          questionText: 'Test',
          options: ['A', 'B'],
          pointValue: 10,
        }),
        'PROP08',
        db
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('rejects missing secret (401)', async () => {
      await createTestPool({ inviteCode: 'PROP09' });

      const request = new Request('http://localhost:3000/api/pools/PROP09/props', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionText: 'Test',
          options: ['A', 'B'],
          pointValue: 10,
        }),
      });

      const response = await createPropHandler(request, 'PROP09', db);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Pool Status Checks', () => {
    it('rejects if pool is locked (403)', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP10', status: 'locked' });

      const response = await createPropHandler(
        createRequest('PROP10', pool.captainSecret, {
          questionText: 'Test',
          options: ['A', 'B'],
          pointValue: 10,
        }),
        'PROP10',
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });

    it('rejects if pool is completed (403)', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP11', status: 'completed' });

      const response = await createPropHandler(
        createRequest('PROP11', pool.captainSecret, {
          questionText: 'Test',
          options: ['A', 'B'],
          pointValue: 10,
        }),
        'PROP11',
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });
  });

  describe('Validation', () => {
    it('rejects fewer than 2 options', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP12' });

      const response = await createPropHandler(
        createRequest('PROP12', pool.captainSecret, {
          questionText: 'Test',
          options: ['A'],
          pointValue: 10,
        }),
        'PROP12',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects more than 10 options', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP13' });

      const response = await createPropHandler(
        createRequest('PROP13', pool.captainSecret, {
          questionText: 'Test',
          options: ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11'],
          pointValue: 10,
        }),
        'PROP13',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects negative pointValue', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP14' });

      const response = await createPropHandler(
        createRequest('PROP14', pool.captainSecret, {
          questionText: 'Test',
          options: ['A', 'B'],
          pointValue: -5,
        }),
        'PROP14',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects zero pointValue', async () => {
      const pool = await createTestPool({ inviteCode: 'PROP15' });

      const response = await createPropHandler(
        createRequest('PROP15', pool.captainSecret, {
          questionText: 'Test',
          options: ['A', 'B'],
          pointValue: 0,
        }),
        'PROP15',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for invalid pool code', async () => {
      const response = await createPropHandler(
        createRequest('INVALID', 'any-secret', {
          questionText: 'Test',
          options: ['A', 'B'],
          pointValue: 10,
        }),
        'INVALID',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });
  });
});
