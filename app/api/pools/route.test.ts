import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { setupTestDb } from '@/src/lib/test-db';
import { pools, participants } from '@/src/lib/schema';
import { eq } from 'drizzle-orm';
import { createPoolHandler, type Database } from './route';

// Helper to create a mock Request
function createRequest(body: unknown) {
  return new Request('http://localhost:3000/api/pools', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/pools', () => {
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

  describe('Happy Path', () => {
    it('creates pool with valid name and captainName', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Super Bowl 2026', captainName: 'John' }),
        db
      );

      expect(response.status).toBe(201);

      const data = await response.json();
      expect(data.name).toBe('Super Bowl 2026');
      expect(data.captainName).toBe('John');
      expect(data.status).toBe('open');
    });

    it('returns invite code that is 6 characters', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'Alice' }),
        db
      );

      const data = await response.json();
      expect(data.inviteCode).toHaveLength(6);
      expect(data.inviteCode).toMatch(/^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/);
    });

    it('stores captain secret as UUID in database (not in response body)', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'Bob' }),
        db
      );

      const data = await response.json();
      // Secret is now in httpOnly cookie, not response body
      expect(data.captainSecret).toBeUndefined();

      // Verify secret is stored in database as valid UUID
      const poolList = await db.select().from(pools).where(eq(pools.id, data.id));
      expect(poolList[0].captainSecret).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('returns pool id as UUID', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'Carol' }),
        db
      );

      const data = await response.json();
      expect(data.id).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });

    it('accepts optional buyInAmount', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'Dave', buyInAmount: '$20' }),
        db
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.buyInAmount).toBe('$20');
    });

    it('accepts optional description', async () => {
      const response = await createPoolHandler(
        createRequest({
          name: 'Super Bowl 2026',
          captainName: 'John',
          description: 'Pick your winners for the big game!',
        }),
        db
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.description).toBe('Pick your winners for the big game!');
    });

    it('returns null description when not provided', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'Alice' }),
        db
      );

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.description).toBeNull();
    });
  });

  describe('Captain as Participant', () => {
    it('creates participant record for captain', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'Captain Jane' }),
        db
      );

      const data = await response.json();

      // Verify participant was created
      const participantList = await db
        .select()
        .from(participants)
        .where(eq(participants.poolId, data.id));

      expect(participantList).toHaveLength(1);
      expect(participantList[0].name).toBe('Captain Jane');
    });

    it('captain participant has same secret as captain_secret', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'Captain Mike' }),
        db
      );

      const data = await response.json();

      // Get pool and participant from database
      const poolList = await db.select().from(pools).where(eq(pools.id, data.id));
      const participantList = await db
        .select()
        .from(participants)
        .where(eq(participants.poolId, data.id));

      // Verify captain participant secret matches pool's captainSecret
      expect(participantList[0].secret).toBe(poolList[0].captainSecret);
    });

    it('captain participant has 0 total_points', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'Captain Sam' }),
        db
      );

      const data = await response.json();

      const participantList = await db
        .select()
        .from(participants)
        .where(eq(participants.poolId, data.id));

      expect(participantList[0].totalPoints).toBe(0);
    });

    it('captain participant has active status', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'Captain Lee' }),
        db
      );

      const data = await response.json();

      const participantList = await db
        .select()
        .from(participants)
        .where(eq(participants.poolId, data.id));

      expect(participantList[0].status).toBe('active');
    });
  });

  describe('Validation', () => {
    it('rejects empty name', async () => {
      const response = await createPoolHandler(
        createRequest({ name: '', captainName: 'John' }),
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects missing name', async () => {
      const response = await createPoolHandler(
        createRequest({ captainName: 'John' }),
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects name over 100 characters', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'a'.repeat(101), captainName: 'John' }),
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects empty captainName', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: '' }),
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects missing captainName', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool' }),
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects captainName over 50 characters', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'a'.repeat(51) }),
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects buyInAmount over 20 characters', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'John', buyInAmount: 'a'.repeat(21) }),
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });

    it('rejects description over 500 characters', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Test Pool', captainName: 'John', description: 'a'.repeat(501) }),
        db
      );

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('Database Persistence', () => {
    it('persists pool to database', async () => {
      const response = await createPoolHandler(
        createRequest({ name: 'Persisted Pool', captainName: 'Tester' }),
        db
      );

      const data = await response.json();

      const poolList = await db
        .select()
        .from(pools)
        .where(eq(pools.id, data.id));

      expect(poolList).toHaveLength(1);
      expect(poolList[0].name).toBe('Persisted Pool');
      expect(poolList[0].captainName).toBe('Tester');
      expect(poolList[0].inviteCode).toBe(data.inviteCode);
      // Captain secret is stored in DB (not returned in response body anymore)
      expect(poolList[0].captainSecret).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
      );
    });
  });
});
