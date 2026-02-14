import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, players } from '@/src/lib/schema';
import { getPoolHandler, updatePoolHandler, type Database } from './route';
import { NextRequest } from 'next/server';
import { createCookieHeader } from '@/src/lib/test-helpers';

// Helper to create a mock GET Request
function createGetRequest(code: string, secret?: string) {
  const url = `http://localhost:3000/api/pools/${code}`;
  return new NextRequest(url, {
    method: 'GET',
    ...(secret ? { headers: { 'Cookie': createCookieHeader(code, secret) } } : {}),
  });
}

// Helper to create a mock PATCH Request for updating pool status
function createPatchRequest(code: string, secret: string, targetStatus = 'locked') {
  return new NextRequest(`http://localhost:3000/api/pools/${code}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': createCookieHeader(code, secret),
    },
    body: JSON.stringify({ status: targetStatus }),
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
    await db.insert(players).values({
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

      const response = await updatePoolHandler(
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

      const response = await updatePoolHandler(
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

      const response = await updatePoolHandler(
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

      const request = new NextRequest('http://localhost:3000/api/pools/LOCK05', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'locked' }),
      });

      const response = await updatePoolHandler(request, 'LOCK05', db);

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });

  describe('Error Handling', () => {
    it('rejects if pool not found (404)', async () => {
      const response = await updatePoolHandler(
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

      const response = await updatePoolHandler(
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

      const response = await updatePoolHandler(
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

describe('PATCH /api/pools/[code] (Edit Pool Details)', () => {
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
      inviteCode: 'EDIT01',
      captainName: 'Captain',
      captainSecret: crypto.randomUUID(),
      status: 'open' as const,
      description: null,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    await db.insert(pools).values(poolData);
    return poolData;
  }

  // Helper to create PATCH request for editing details
  function createEditRequest(code: string, secret: string, body: Record<string, unknown>) {
    return new NextRequest(`http://localhost:3000/api/pools/${code}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': createCookieHeader(code, secret),
      },
      body: JSON.stringify(body),
    });
  }

  describe('Edit Name', () => {
    it('updates pool name in open status', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT02' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT02', pool.captainSecret, { name: 'New Pool Name' }),
        'EDIT02',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('New Pool Name');
    });

    it('also updates pool name in open status with explicit status', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT03', status: 'open' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT03', pool.captainSecret, { name: 'Updated Name' }),
        'EDIT03',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('Updated Name');
    });

    it('rejects empty name', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT04' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT04', pool.captainSecret, { name: '' }),
        'EDIT04',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects name over 100 characters', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT05' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT05', pool.captainSecret, { name: 'a'.repeat(101) }),
        'EDIT05',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Edit Description', () => {
    it('updates pool description', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT06' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT06', pool.captainSecret, { description: 'A fun pool for friends!' }),
        'EDIT06',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.description).toBe('A fun pool for friends!');
    });

    it('can clear description by setting to null', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT07', description: 'Existing description' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT07', pool.captainSecret, { description: null }),
        'EDIT07',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.description).toBeNull();
    });

    it('rejects description over 500 characters', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT08' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT08', pool.captainSecret, { description: 'a'.repeat(501) }),
        'EDIT08',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Edit Multiple Fields', () => {
    it('updates name and description together', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT09' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT09', pool.captainSecret, {
          name: 'Super Bowl Party',
          description: 'Join us for the big game!',
        }),
        'EDIT09',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.name).toBe('Super Bowl Party');
      expect(data.description).toBe('Join us for the big game!');
    });
  });

  describe('Edit Restrictions', () => {
    it('rejects editing locked pool', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT10', status: 'locked' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT10', pool.captainSecret, { name: 'New Name' }),
        'EDIT10',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });

    it('rejects editing completed pool', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT11', status: 'completed' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT11', pool.captainSecret, { name: 'New Name' }),
        'EDIT11',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });

    it('rejects non-captain editing', async () => {
      await createTestPool({ inviteCode: 'EDIT12' });

      const response = await updatePoolHandler(
        createEditRequest('EDIT12', 'wrong-secret', { name: 'New Name' }),
        'EDIT12',
        db
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });
});

describe('PATCH /api/pools/[code] (Complete Pool)', () => {
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
      inviteCode: 'COMP01',
      captainName: 'Captain',
      captainSecret: crypto.randomUUID(),
      status: 'locked' as const,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    await db.insert(pools).values(poolData);
    return poolData;
  }

  // Helper to create PATCH request for completing pool
  function createCompleteRequest(code: string, secret: string) {
    return new NextRequest(`http://localhost:3000/api/pools/${code}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': createCookieHeader(code, secret),
      },
      body: JSON.stringify({ status: 'completed' }),
    });
  }

  describe('Happy Path', () => {
    it('updates status from locked to completed', async () => {
      const pool = await createTestPool({ inviteCode: 'COMP02' });

      const response = await updatePoolHandler(
        createCompleteRequest('COMP02', pool.captainSecret),
        'COMP02',
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.status).toBe('completed');
    });

    it('returns updated pool data', async () => {
      const pool = await createTestPool({ inviteCode: 'COMP03', name: 'Completable Pool' });

      const response = await updatePoolHandler(
        createCompleteRequest('COMP03', pool.captainSecret),
        'COMP03',
        db
      );

      const data = await response.json();
      expect(data.name).toBe('Completable Pool');
      expect(data.status).toBe('completed');
    });
  });

  describe('Error Handling', () => {
    it('rejects completing an open pool (must lock first)', async () => {
      const pool = await createTestPool({ inviteCode: 'COMP04', status: 'open' });

      const response = await updatePoolHandler(
        createCompleteRequest('COMP04', pool.captainSecret),
        'COMP04',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('INVALID_TRANSITION');
    });

    it('rejects completing an already completed pool', async () => {
      const pool = await createTestPool({ inviteCode: 'COMP06', status: 'completed' });

      const response = await updatePoolHandler(
        createCompleteRequest('COMP06', pool.captainSecret),
        'COMP06',
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });

    it('rejects unauthorized completion', async () => {
      await createTestPool({ inviteCode: 'COMP07' });

      const response = await updatePoolHandler(
        createCompleteRequest('COMP07', 'wrong-secret'),
        'COMP07',
        db
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });
  });
});
