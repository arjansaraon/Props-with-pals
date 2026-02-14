import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, players } from '@/src/lib/schema';
import { createCookieHeader } from '@/src/lib/test-helpers';
import { getPoolWithAuth, getPoolWithPlayerAuth, type Database } from './api-helpers';

function createRequest(code: string, secret?: string): Request {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (secret) {
    headers['Cookie'] = createCookieHeader(code, secret);
  }
  return new Request(`http://localhost:3000/api/pools/${code}`, { headers });
}

describe('getPoolWithAuth', () => {
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

  async function createPool(overrides: Partial<typeof pools.$inferInsert> = {}) {
    const now = new Date().toISOString();
    const data = {
      id: crypto.randomUUID(),
      name: 'Test Pool',
      inviteCode: 'AUTH01',
      captainName: 'Captain',
      captainSecret: 'captain-secret-123',
      status: 'open' as const,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
      ...overrides,
    };
    await db.insert(pools).values(data);
    return data;
  }

  it('returns 404 when pool not found', async () => {
    const result = await getPoolWithAuth('NOPE', createRequest('NOPE'), db);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(404);
      const data = await result.response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    }
  });

  it('returns pool without auth when requireCaptain is false', async () => {
    const pool = await createPool();
    const result = await getPoolWithAuth(pool.inviteCode, createRequest(pool.inviteCode), db);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.pool.id).toBe(pool.id);
    }
  });

  it('returns 401 when captain required but no secret', async () => {
    await createPool({ inviteCode: 'AUTH02' });
    const result = await getPoolWithAuth(
      'AUTH02',
      createRequest('AUTH02'), // no secret
      db,
      { requireCaptain: true }
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns 401 when captain required but wrong secret', async () => {
    await createPool({ inviteCode: 'AUTH03' });
    const result = await getPoolWithAuth(
      'AUTH03',
      createRequest('AUTH03', 'wrong-secret'),
      db,
      { requireCaptain: true }
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
    }
  });

  it('returns pool with isCaptain true on valid captain secret', async () => {
    const pool = await createPool({ inviteCode: 'AUTH04' });
    const result = await getPoolWithAuth(
      'AUTH04',
      createRequest('AUTH04', pool.captainSecret),
      db,
      { requireCaptain: true }
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.pool.id).toBe(pool.id);
      expect(result.isCaptain).toBe(true);
    }
  });
});

describe('getPoolWithPlayerAuth', () => {
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

  async function createPoolWithPlayer(
    poolOverrides: Partial<typeof pools.$inferInsert> = {}
  ) {
    const now = new Date().toISOString();
    const poolData = {
      id: crypto.randomUUID(),
      name: 'Test Pool',
      inviteCode: 'PLAY01',
      captainName: 'Captain',
      captainSecret: crypto.randomUUID(),
      status: 'open' as const,
      buyInAmount: null,
      createdAt: now,
      updatedAt: now,
      ...poolOverrides,
    };
    await db.insert(pools).values(poolData);

    const playerSecret = crypto.randomUUID();
    const playerData = {
      id: crypto.randomUUID(),
      poolId: poolData.id,
      name: 'Test Player',
      secret: playerSecret,
      totalPoints: 0,
      paid: null,
      status: 'active' as const,
      joinedAt: now,
      updatedAt: now,
    };
    await db.insert(players).values(playerData);

    return { pool: poolData, player: playerData, playerSecret };
  }

  it('returns 401 when no secret provided', async () => {
    await createPoolWithPlayer();
    const result = await getPoolWithPlayerAuth(
      'PLAY01',
      createRequest('PLAY01'), // no secret
      db
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns 404 when pool not found', async () => {
    const result = await getPoolWithPlayerAuth(
      'NOPE',
      createRequest('NOPE', 'any-secret'),
      db
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(404);
      const data = await result.response.json();
      expect(data.code).toBe('POOL_NOT_FOUND');
    }
  });

  it('returns 401 when secret does not match any player', async () => {
    await createPoolWithPlayer({ inviteCode: 'PLAY02' });
    const result = await getPoolWithPlayerAuth(
      'PLAY02',
      createRequest('PLAY02', 'wrong-secret'),
      db
    );
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.response.status).toBe(401);
      const data = await result.response.json();
      expect(data.code).toBe('UNAUTHORIZED');
    }
  });

  it('returns pool and player on valid player secret', async () => {
    const { pool, player, playerSecret } = await createPoolWithPlayer({ inviteCode: 'PLAY03' });
    const result = await getPoolWithPlayerAuth(
      'PLAY03',
      createRequest('PLAY03', playerSecret),
      db
    );
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.pool.id).toBe(pool.id);
      expect(result.player.id).toBe(player.id);
      expect(result.player.name).toBe('Test Player');
    }
  });
});
