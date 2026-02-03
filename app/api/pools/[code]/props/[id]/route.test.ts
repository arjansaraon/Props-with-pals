import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, props } from '@/src/lib/schema';
import { updatePropHandler, deletePropHandler, type Database } from './route';
import { NextRequest } from 'next/server';

// Helper to create a mock PATCH Request
function createPatchRequest(code: string, propId: string, secret: string, body: unknown) {
  return new NextRequest(
    `http://localhost:3000/api/pools/${code}/props/${propId}?secret=${secret}`,
    {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }
  );
}

// Helper to create a mock DELETE Request
function createDeleteRequest(code: string, propId: string, secret: string) {
  return new NextRequest(
    `http://localhost:3000/api/pools/${code}/props/${propId}?secret=${secret}`,
    {
      method: 'DELETE',
    }
  );
}

describe('PATCH /api/pools/[code]/props/[id]', () => {
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
      status: 'draft' as const,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    await db.insert(pools).values(poolData);
    return poolData;
  }

  // Helper to create a test prop
  async function createTestProp(poolId: string, overrides: Partial<typeof props.$inferInsert> = {}) {
    const now = new Date().toISOString();
    const propData = {
      id: crypto.randomUUID(),
      poolId,
      questionText: 'Who wins?',
      options: ['Team A', 'Team B'],
      pointValue: 10,
      correctOptionIndex: null,
      category: null,
      status: 'active' as const,
      order: 0,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    await db.insert(props).values(propData);
    return propData;
  }

  describe('Draft Status - Full Edit', () => {
    it('updates questionText in draft', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT02' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT02', prop.id, pool.captainSecret, {
          questionText: 'Updated question?',
        }),
        'EDIT02',
        prop.id,
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.questionText).toBe('Updated question?');
    });

    it('updates options in draft', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT03' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT03', prop.id, pool.captainSecret, {
          options: ['Option 1', 'Option 2', 'Option 3'],
        }),
        'EDIT03',
        prop.id,
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.options).toEqual(['Option 1', 'Option 2', 'Option 3']);
    });

    it('updates pointValue in draft', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT04' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT04', prop.id, pool.captainSecret, {
          pointValue: 25,
        }),
        'EDIT04',
        prop.id,
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.pointValue).toBe(25);
    });

    it('updates multiple fields at once in draft', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT05' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT05', prop.id, pool.captainSecret, {
          questionText: 'New question?',
          options: ['A', 'B', 'C'],
          pointValue: 15,
          category: 'Sports',
        }),
        'EDIT05',
        prop.id,
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.questionText).toBe('New question?');
      expect(data.options).toEqual(['A', 'B', 'C']);
      expect(data.pointValue).toBe(15);
      expect(data.category).toBe('Sports');
    });
  });

  describe('Open Status - Text Only Edit', () => {
    it('allows questionText edit when open', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT06', status: 'open' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT06', prop.id, pool.captainSecret, {
          questionText: 'Fixed typo?',
        }),
        'EDIT06',
        prop.id,
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.questionText).toBe('Fixed typo?');
    });

    it('rejects options edit when open', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT07', status: 'open' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT07', prop.id, pool.captainSecret, {
          options: ['New A', 'New B'],
        }),
        'EDIT07',
        prop.id,
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
      expect(data.message).toContain('questionText');
    });

    it('rejects pointValue edit when open', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT08', status: 'open' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT08', prop.id, pool.captainSecret, {
          pointValue: 50,
        }),
        'EDIT08',
        prop.id,
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Locked/Completed - No Edit', () => {
    it('rejects edit when locked', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT09', status: 'locked' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT09', prop.id, pool.captainSecret, {
          questionText: 'Too late',
        }),
        'EDIT09',
        prop.id,
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });

    it('rejects edit when completed', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT10', status: 'completed' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT10', prop.id, pool.captainSecret, {
          questionText: 'Way too late',
        }),
        'EDIT10',
        prop.id,
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });
  });

  describe('Authorization', () => {
    it('rejects wrong secret', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT11' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT11', prop.id, 'wrong-secret', {
          questionText: 'Hacker?',
        }),
        'EDIT11',
        prop.id,
        db
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('rejects missing secret', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT12' });
      const prop = await createTestProp(pool.id);

      const request = new NextRequest(
        `http://localhost:3000/api/pools/EDIT12/props/${prop.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ questionText: 'No auth' }),
        }
      );

      const response = await updatePropHandler(request, 'EDIT12', prop.id, db);

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for non-existent pool', async () => {
      const response = await updatePropHandler(
        createPatchRequest('NOTFOUND', 'any-id', 'any-secret', {
          questionText: 'Test',
        }),
        'NOTFOUND',
        'any-id',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });

    it('returns 404 for non-existent prop', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT13' });

      const response = await updatePropHandler(
        createPatchRequest('EDIT13', 'fake-prop-id', pool.captainSecret, {
          questionText: 'Test',
        }),
        'EDIT13',
        'fake-prop-id',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('PROP_NOT_FOUND');
    });

    it('rejects empty questionText', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT14' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT14', prop.id, pool.captainSecret, {
          questionText: '   ',
        }),
        'EDIT14',
        prop.id,
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects options with less than 2 items', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT15' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT15', prop.id, pool.captainSecret, {
          options: ['Only one'],
        }),
        'EDIT15',
        prop.id,
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects negative pointValue', async () => {
      const pool = await createTestPool({ inviteCode: 'EDIT16' });
      const prop = await createTestProp(pool.id);

      const response = await updatePropHandler(
        createPatchRequest('EDIT16', prop.id, pool.captainSecret, {
          pointValue: -5,
        }),
        'EDIT16',
        prop.id,
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('DELETE /api/pools/[code]/props/[id]', () => {
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
      inviteCode: 'DEL01',
      captainName: 'Captain',
      captainSecret: crypto.randomUUID(),
      status: 'draft' as const,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    await db.insert(pools).values(poolData);
    return poolData;
  }

  // Helper to create a test prop
  async function createTestProp(poolId: string, overrides: Partial<typeof props.$inferInsert> = {}) {
    const now = new Date().toISOString();
    const propData = {
      id: crypto.randomUUID(),
      poolId,
      questionText: 'Who wins?',
      options: ['Team A', 'Team B'],
      pointValue: 10,
      correctOptionIndex: null,
      category: null,
      status: 'active' as const,
      order: 0,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };

    await db.insert(props).values(propData);
    return propData;
  }

  describe('Happy Path', () => {
    it('deletes prop in draft status', async () => {
      const pool = await createTestPool({ inviteCode: 'DEL02' });
      const prop = await createTestProp(pool.id);

      const response = await deletePropHandler(
        createDeleteRequest('DEL02', prop.id, pool.captainSecret),
        'DEL02',
        prop.id,
        db
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.success).toBe(true);

      // Verify prop is actually deleted
      const remaining = await db.select().from(props).where(require('drizzle-orm').eq(props.id, prop.id));
      expect(remaining.length).toBe(0);
    });
  });

  describe('Status Restrictions', () => {
    it('rejects delete when pool is open', async () => {
      const pool = await createTestPool({ inviteCode: 'DEL03', status: 'open' });
      const prop = await createTestProp(pool.id);

      const response = await deletePropHandler(
        createDeleteRequest('DEL03', prop.id, pool.captainSecret),
        'DEL03',
        prop.id,
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });

    it('rejects delete when pool is locked', async () => {
      const pool = await createTestPool({ inviteCode: 'DEL04', status: 'locked' });
      const prop = await createTestProp(pool.id);

      const response = await deletePropHandler(
        createDeleteRequest('DEL04', prop.id, pool.captainSecret),
        'DEL04',
        prop.id,
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });

    it('rejects delete when pool is completed', async () => {
      const pool = await createTestPool({ inviteCode: 'DEL05', status: 'completed' });
      const prop = await createTestProp(pool.id);

      const response = await deletePropHandler(
        createDeleteRequest('DEL05', prop.id, pool.captainSecret),
        'DEL05',
        prop.id,
        db
      );

      expect(response.status).toBe(403);
      const data = await response.json();
      expect(data.code).toBe('POOL_LOCKED');
    });
  });

  describe('Authorization', () => {
    it('rejects wrong secret', async () => {
      const pool = await createTestPool({ inviteCode: 'DEL06' });
      const prop = await createTestProp(pool.id);

      const response = await deletePropHandler(
        createDeleteRequest('DEL06', prop.id, 'wrong-secret'),
        'DEL06',
        prop.id,
        db
      );

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    });

    it('rejects missing secret', async () => {
      const pool = await createTestPool({ inviteCode: 'DEL07' });
      const prop = await createTestProp(pool.id);

      const request = new NextRequest(
        `http://localhost:3000/api/pools/DEL07/props/${prop.id}`,
        { method: 'DELETE' }
      );

      const response = await deletePropHandler(request, 'DEL07', prop.id, db);

      expect(response.status).toBe(401);
    });
  });

  describe('Error Handling', () => {
    it('returns 404 for non-existent pool', async () => {
      const response = await deletePropHandler(
        createDeleteRequest('NOTFOUND', 'any-id', 'any-secret'),
        'NOTFOUND',
        'any-id',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    });

    it('returns 404 for non-existent prop', async () => {
      const pool = await createTestPool({ inviteCode: 'DEL08' });

      const response = await deletePropHandler(
        createDeleteRequest('DEL08', 'fake-prop-id', pool.captainSecret),
        'DEL08',
        'fake-prop-id',
        db
      );

      expect(response.status).toBe(404);
      const data = await response.json();
      expect(data.code).toBe('PROP_NOT_FOUND');
    });
  });
});
