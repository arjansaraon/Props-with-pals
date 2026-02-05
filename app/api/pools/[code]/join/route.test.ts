import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, participants } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { joinPoolHandler, type Database } from './route';

// Helper to create a mock POST Request
function createRequest(code: string, body: unknown) {
  return new Request(`http://localhost:3000/api/pools/${code}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/pools/[code]/join', () => {
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
      inviteCode: 'JOIN01',
      captainName: 'Captain',
      captainSecret: crypto.randomUUID(),
      status: 'open' as const,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    await db.insert(pools).values(poolData);

    // Also create captain as participant
    await db.insert(participants).values({
      id: crypto.randomUUID(),
      poolId: poolData.id,
      name: poolData.captainName,
      secret: poolData.captainSecret,
      totalPoints: 0,
      paid: null,
      status: 'active',
      joinedAt: now,
      updatedAt: now,
    });

    return poolData;
  }

  describe('Happy Path', () => {
    it('creates participant with valid name', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN02' });

      const response = await joinPoolHandler(
        createRequest('JOIN02', { name: 'Alice' }),
        'JOIN02',
        db
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.name).toBe('Alice');
    });

    it('stores participant secret as UUID in database (not in response body)', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN03' });

      const response = await joinPoolHandler(
        createRequest('JOIN03', { name: 'Bob' }),
        'JOIN03',
        db
      );

      const data = await response.json();
      // Secret is now in httpOnly cookie, not response body
      expect(data.secret).toBeUndefined();

      // Verify secret is stored in database as valid UUID
      const participantList = await db
        .select()
        .from(participants)
        .where(eq(participants.id, data.id));
      expect(participantList[0].secret).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('sets total_points to 0', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN04' });

      const response = await joinPoolHandler(
        createRequest('JOIN04', { name: 'Carol' }),
        'JOIN04',
        db
      );

      const data = await response.json();
      expect(data.totalPoints).toBe(0);
    });

    it('sets status to active', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN05' });

      const response = await joinPoolHandler(
        createRequest('JOIN05', { name: 'Dave' }),
        'JOIN05',
        db
      );

      const data = await response.json();
      expect(data.status).toBe('active');
    });

    it('persists participant to database', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN06' });

      const response = await joinPoolHandler(
        createRequest('JOIN06', { name: 'Eve' }),
        'JOIN06',
        db
      );

      const data = await response.json();

      const participantList = await db
        .select()
        .from(participants)
        .where(eq(participants.id, data.id));

      expect(participantList).toHaveLength(1);
      expect(participantList[0].name).toBe('Eve');
      expect(participantList[0].poolId).toBe(pool.id);
    });
  });

  describe('Pool Status Checks', () => {
    it('rejects if pool is locked (403)', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN07', status: 'locked' });

      const response = await joinPoolHandler(
        createRequest('JOIN07', { name: 'Alice' }),
        'JOIN07',
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });

    it('rejects if pool is completed (403)', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN08', status: 'completed' });

      const response = await joinPoolHandler(
        createRequest('JOIN08', { name: 'Alice' }),
        'JOIN08',
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });
  });

  describe('Duplicate Name Handling', () => {
    it('rejects duplicate name (409)', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN09' });

      // First join succeeds
      await joinPoolHandler(
        createRequest('JOIN09', { name: 'Alice' }),
        'JOIN09',
        db
      );

      // Second join with same name fails
      const response = await joinPoolHandler(
        createRequest('JOIN09', { name: 'Alice' }),
        'JOIN09',
        db
      );

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.code).toBe('NAME_TAKEN');
    });

    it('rejects captain name (409)', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN10', captainName: 'Captain John' });

      const response = await joinPoolHandler(
        createRequest('JOIN10', { name: 'Captain John' }),
        'JOIN10',
        db
      );

      expect(response.status).toBe(409);
      const data = await response.json();
      expect(data.code).toBe('NAME_TAKEN');
    });
  });

  describe('Validation', () => {
    it('rejects empty name', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN11' });

      const response = await joinPoolHandler(
        createRequest('JOIN11', { name: '' }),
        'JOIN11',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects name over 50 characters', async () => {
      const pool = await createTestPool({ inviteCode: 'JOIN12' });

      const response = await joinPoolHandler(
        createRequest('JOIN12', { name: 'a'.repeat(51) }),
        'JOIN12',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for invalid pool code', async () => {
      const response = await joinPoolHandler(
        createRequest('INVALID', { name: 'Alice' }),
        'INVALID',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });
  });
});
