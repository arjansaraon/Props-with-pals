import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, players } from '@/src/lib/schema';
import { recoverHandler, type Database } from './route';

function createPostRequest(code: string, body: Record<string, unknown>) {
  return new Request(`http://localhost:3000/api/pools/${code}/recover`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/pools/[code]/recover', () => {
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

  async function createTestPool(overrides: Partial<typeof pools.$inferInsert> = {}) {
    const now = new Date().toISOString();
    const poolData = {
      id: crypto.randomUUID(),
      name: 'Test Pool',
      inviteCode: 'RECV01',
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

  async function addPlayer(poolId: string, name: string) {
    const now = new Date().toISOString();
    const playerData = {
      id: crypto.randomUUID(),
      poolId,
      name,
      secret: crypto.randomUUID(),
      totalPoints: 0,
      paid: null,
      status: 'active' as const,
      joinedAt: now,
      updatedAt: now,
    };

    await db.insert(players).values(playerData);
    return playerData;
  }

  it('returns 400 if no secret provided', async () => {
    await createTestPool({ inviteCode: 'RECV02' });

    const response = await recoverHandler(
      createPostRequest('RECV02', {}),
      'RECV02',
      db
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('MISSING_SECRET');
  });

  it('returns 404 if pool not found', async () => {
    const response = await recoverHandler(
      createPostRequest('INVALID', { secret: 'some-secret' }),
      'INVALID',
      db
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.code).toBe('POOL_NOT_FOUND');
  });

  it('returns 401 if secret does not match any player', async () => {
    await createTestPool({ inviteCode: 'RECV03' });

    const response = await recoverHandler(
      createPostRequest('RECV03', { secret: 'wrong-secret' }),
      'RECV03',
      db
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.code).toBe('INVALID_SECRET');
  });

  it('returns 200 and player name for valid secret', async () => {
    const pool = await createTestPool({ inviteCode: 'RECV04' });
    const player = await addPlayer(pool.id, 'Alice');

    const response = await recoverHandler(
      createPostRequest('RECV04', { secret: player.secret }),
      'RECV04',
      db
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.name).toBe('Alice');
  });

  it('works for captain secret too', async () => {
    const pool = await createTestPool({ inviteCode: 'RECV05' });

    const response = await recoverHandler(
      createPostRequest('RECV05', { secret: pool.captainSecret }),
      'RECV05',
      db
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.name).toBe('Captain');
  });

  it('sets auth cookie on successful recovery', async () => {
    const pool = await createTestPool({ inviteCode: 'RECV06' });
    const player = await addPlayer(pool.id, 'Bob');

    const response = await recoverHandler(
      createPostRequest('RECV06', { secret: player.secret }),
      'RECV06',
      db
    );

    expect(response.status).toBe(200);
    // Check that a Set-Cookie header is present
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('pwp_auth');
  });
});
