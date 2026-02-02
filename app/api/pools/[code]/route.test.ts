import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, participants } from '@/src/lib/schema';
import { getPoolHandler, lockPoolHandler, type Database } from './route';

// Helper to create a mock GET Request
function createGetRequest(code: string) {
  return new Request(`http://localhost:3000/api/pools/${code}`, {
    method: 'GET',
  });
}

// Helper to create a mock PATCH Request for locking pool
function createPatchRequest(code: string, secret: string) {
  return new Request(`http://localhost:3000/api/pools/${code}?secret=${secret}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status: 'locked' }),
  });
}

describe('GET /api/pools/[code]', () => {
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

  // Helper to create a test pool directly in the database
  async function createTestPool(overrides: Partial<typeof pools.$inferInsert> = {}) {
    const now = new Date().toISOString();
    const poolData = {
      id: crypto.randomUUID(),
      name: 'Test Pool',
      inviteCode: 'ABC123',
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
    it('returns pool by invite code', async () => {
      const pool = await createTestPool({ inviteCode: 'XYZ789' });

      const response = await getPoolHandler(createGetRequest('XYZ789'), 'XYZ789', db);

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('Test Pool');
      expect(data.inviteCode).toBe('XYZ789');
    });

    it('returns pool with all public fields', async () => {
      const pool = await createTestPool({
        inviteCode: 'TEST01',
        name: 'Super Bowl Party',
        captainName: 'John',
        buyInAmount: '$20',
      });

      const response = await getPoolHandler(createGetRequest('TEST01'), 'TEST01', db);

      const data = await response.json();
      expect(data.id).toBe(pool.id);
      expect(data.name).toBe('Super Bowl Party');
      expect(data.inviteCode).toBe('TEST01');
      expect(data.captainName).toBe('John');
      expect(data.buyInAmount).toBe('$20');
      expect(data.status).toBe('open');
      expect(data.createdAt).toBeDefined();
    });
  });

  describe('Security', () => {
    it('does NOT return captain_secret', async () => {
      const pool = await createTestPool({ inviteCode: 'SECRET' });

      const response = await getPoolHandler(createGetRequest('SECRET'), 'SECRET', db);

      const data = await response.json();
      expect(data.captainSecret).toBeUndefined();
      expect(data.captain_secret).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for invalid invite code', async () => {
      const response = await getPoolHandler(createGetRequest('INVALID'), 'INVALID', db);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });

    it('returns 404 for empty invite code', async () => {
      const response = await getPoolHandler(createGetRequest(''), '', db);

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });
  });
});

describe('PATCH /api/pools/[code] (Lock Pool)', () => {
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
      inviteCode: 'LOCK01',
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
    it('updates status from open to locked', async () => {
      const pool = await createTestPool({ inviteCode: 'LOCK02' });

      const response = await lockPoolHandler(
        createPatchRequest('LOCK02', pool.captainSecret),
        'LOCK02',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('locked');
    });

    it('returns updated pool data', async () => {
      const pool = await createTestPool({ inviteCode: 'LOCK03', name: 'Lockable Pool' });

      const response = await lockPoolHandler(
        createPatchRequest('LOCK03', pool.captainSecret),
        'LOCK03',
        db
      );

      const data = await response.json();
      expect(data.name).toBe('Lockable Pool');
      expect(data.status).toBe('locked');
    });
  });

  describe('Authorization', () => {
    it('rejects wrong captain_secret (401)', async () => {
      await createTestPool({ inviteCode: 'LOCK04' });

      const response = await lockPoolHandler(
        createPatchRequest('LOCK04', 'wrong-secret'),
        'LOCK04',
        db
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('rejects missing secret (401)', async () => {
      await createTestPool({ inviteCode: 'LOCK05' });

      const request = new Request('http://localhost:3000/api/pools/LOCK05', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' }),
      });

      const response = await lockPoolHandler(request, 'LOCK05', db);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Error Handling', () => {
    it('rejects if pool not found (404)', async () => {
      const response = await lockPoolHandler(
        createPatchRequest('NOTFOUND', 'any-secret'),
        'NOTFOUND',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });

    it('rejects if already locked (400)', async () => {
      const pool = await createTestPool({ inviteCode: 'LOCK06', status: 'locked' });

      const response = await lockPoolHandler(
        createPatchRequest('LOCK06', pool.captainSecret),
        'LOCK06',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });

    it('rejects if completed (400)', async () => {
      const pool = await createTestPool({ inviteCode: 'LOCK07', status: 'completed' });

      const response = await lockPoolHandler(
        createPatchRequest('LOCK07', pool.captainSecret),
        'LOCK07',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });
  });
});
