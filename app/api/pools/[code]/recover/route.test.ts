import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, players, recoveryTokens } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
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

  async function createTestToken(
    poolId: string,
    playerId: string,
    overrides: Partial<typeof recoveryTokens.$inferInsert> = {}
  ) {
    const tokenStr = crypto.randomUUID();
    const now = new Date().toISOString();
    const tokenData = {
      id: crypto.randomUUID(),
      token: tokenStr,
      playerId,
      poolId,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      usedAt: null,
      createdAt: now,
      ...overrides,
    };
    await db.insert(recoveryTokens).values(tokenData);
    return tokenData;
  }

  it('returns 400 if no token provided', async () => {
    await createTestPool({ inviteCode: 'RECV02' });

    const response = await recoverHandler(
      createPostRequest('RECV02', {}),
      'RECV02',
      db
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('MISSING_TOKEN');
  });

  it('returns 400 if old-style secret is sent instead of token', async () => {
    const pool = await createTestPool({ inviteCode: 'RECV02B' });

    const response = await recoverHandler(
      createPostRequest('RECV02B', { secret: pool.captainSecret }),
      'RECV02B',
      db
    );

    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.code).toBe('MISSING_TOKEN');
  });

  it('returns 404 if pool not found', async () => {
    const response = await recoverHandler(
      createPostRequest('INVALID', { token: 'some-token' }),
      'INVALID',
      db
    );

    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.code).toBe('POOL_NOT_FOUND');
  });

  it('returns 401 if token does not exist', async () => {
    await createTestPool({ inviteCode: 'RECV03' });

    const response = await recoverHandler(
      createPostRequest('RECV03', { token: 'nonexistent-token' }),
      'RECV03',
      db
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 if token is expired', async () => {
    const pool = await createTestPool({ inviteCode: 'RECV03B' });
    const player = await addPlayer(pool.id, 'Alice');
    const token = await createTestToken(pool.id, player.id, {
      expiresAt: new Date(Date.now() - 1000).toISOString(), // expired 1 second ago
    });

    const response = await recoverHandler(
      createPostRequest('RECV03B', { token: token.token }),
      'RECV03B',
      db
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.code).toBe('INVALID_TOKEN');
  });

  it('returns 401 if token is already used', async () => {
    const pool = await createTestPool({ inviteCode: 'RECV03C' });
    const player = await addPlayer(pool.id, 'Alice');
    const token = await createTestToken(pool.id, player.id, {
      usedAt: new Date().toISOString(), // already used
    });

    const response = await recoverHandler(
      createPostRequest('RECV03C', { token: token.token }),
      'RECV03C',
      db
    );

    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.code).toBe('INVALID_TOKEN');
  });

  it('returns 200 and player name for valid token', async () => {
    const pool = await createTestPool({ inviteCode: 'RECV04' });
    const player = await addPlayer(pool.id, 'Alice');
    const token = await createTestToken(pool.id, player.id);

    const response = await recoverHandler(
      createPostRequest('RECV04', { token: token.token }),
      'RECV04',
      db
    );

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.name).toBe('Alice');
  });

  it('works for captain token too', async () => {
    const pool = await createTestPool({ inviteCode: 'RECV05' });

    // Find the captain's player record
    const captainPlayer = await db
      .select()
      .from(players)
      .where(eq(players.poolId, pool.id))
      .limit(1);

    const token = await createTestToken(pool.id, captainPlayer[0].id);

    const response = await recoverHandler(
      createPostRequest('RECV05', { token: token.token }),
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
    const token = await createTestToken(pool.id, player.id);

    const response = await recoverHandler(
      createPostRequest('RECV06', { token: token.token }),
      'RECV06',
      db
    );

    expect(response.status).toBe(200);
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toBeTruthy();
    expect(setCookie).toContain('pwp_auth');
  });

  it('marks token as used after redemption', async () => {
    const pool = await createTestPool({ inviteCode: 'RECV07' });
    const player = await addPlayer(pool.id, 'Charlie');
    const token = await createTestToken(pool.id, player.id);

    await recoverHandler(
      createPostRequest('RECV07', { token: token.token }),
      'RECV07',
      db
    );

    // Verify token is marked as used
    const updatedToken = await db
      .select()
      .from(recoveryTokens)
      .where(eq(recoveryTokens.id, token.id))
      .limit(1);

    expect(updatedToken[0].usedAt).not.toBeNull();
  });

  it('rejects same token on second use', async () => {
    const pool = await createTestPool({ inviteCode: 'RECV08' });
    const player = await addPlayer(pool.id, 'Dana');
    const token = await createTestToken(pool.id, player.id);

    // First use — should succeed
    const first = await recoverHandler(
      createPostRequest('RECV08', { token: token.token }),
      'RECV08',
      db
    );
    expect(first.status).toBe(200);

    // Second use — should fail
    const second = await recoverHandler(
      createPostRequest('RECV08', { token: token.token }),
      'RECV08',
      db
    );
    expect(second.status).toBe(401);
    const data = await second.json();
    expect(data.code).toBe('INVALID_TOKEN');
  });
});
