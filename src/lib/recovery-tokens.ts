import { recoveryTokens, players } from './schema';
import { eq, and, or, isNotNull, lte } from 'drizzle-orm';
import type { LibSQLDatabase } from 'drizzle-orm/libsql';
import type * as schema from './schema';

type Database = LibSQLDatabase<typeof schema>;

const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generates a cryptographically secure random token string.
 * 32 random bytes → base64url encoding (43 characters).
 */
export function generateTokenString(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Buffer.from(bytes).toString('base64url');
}

/**
 * Gets existing valid tokens or creates new ones for players in a pool.
 * Cleans up expired/used tokens first, then reuses valid ones.
 * Only generates new tokens for players that don't already have one.
 * Returns a map of playerId → token string.
 */
export async function getOrCreateTokensForPool(
  database: Database,
  poolId: string,
  playerIds: string[]
): Promise<Map<string, string>> {
  const now = new Date().toISOString();

  // Clean up expired and used tokens for this pool
  await database
    .delete(recoveryTokens)
    .where(
      and(
        eq(recoveryTokens.poolId, poolId),
        or(
          isNotNull(recoveryTokens.usedAt),
          lte(recoveryTokens.expiresAt, now)
        )
      )
    );

  // Fetch existing valid tokens for this pool
  const existingTokens = await database
    .select({
      playerId: recoveryTokens.playerId,
      token: recoveryTokens.token,
    })
    .from(recoveryTokens)
    .where(eq(recoveryTokens.poolId, poolId));

  const tokenMap = new Map<string, string>();

  // Index existing tokens by playerId
  for (const t of existingTokens) {
    tokenMap.set(t.playerId, t.token);
  }

  // Generate new tokens only for players without a valid one
  const expiresAt = new Date(Date.now() + TOKEN_TTL_MS).toISOString();

  for (const playerId of playerIds) {
    if (!tokenMap.has(playerId)) {
      const tokenStr = generateTokenString();
      await database.insert(recoveryTokens).values({
        id: crypto.randomUUID(),
        token: tokenStr,
        playerId,
        poolId,
        expiresAt,
        createdAt: now,
      });
      tokenMap.set(playerId, tokenStr);
    }
  }

  return tokenMap;
}

/**
 * Redeems a recovery token. Returns player info if valid, null otherwise.
 * Marks the token as used (single-use enforcement).
 * Uses a transaction to prevent double-redemption race conditions.
 */
export async function redeemToken(
  database: Database,
  token: string,
  poolId: string
): Promise<{ playerId: string; playerSecret: string; playerName: string } | null> {
  return database.transaction(async (tx) => {
    // Look up token joined to players to get their secret and name
    const result = await tx
      .select({
        tokenId: recoveryTokens.id,
        playerId: recoveryTokens.playerId,
        expiresAt: recoveryTokens.expiresAt,
        usedAt: recoveryTokens.usedAt,
        playerSecret: players.secret,
        playerName: players.name,
      })
      .from(recoveryTokens)
      .innerJoin(players, eq(recoveryTokens.playerId, players.id))
      .where(
        and(
          eq(recoveryTokens.token, token),
          eq(recoveryTokens.poolId, poolId)
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];

    // Reject if already used
    if (row.usedAt) return null;

    // Reject if expired
    if (new Date(row.expiresAt) < new Date()) return null;

    // Mark as used
    await tx
      .update(recoveryTokens)
      .set({ usedAt: new Date().toISOString() })
      .where(eq(recoveryTokens.id, row.tokenId));

    return {
      playerId: row.playerId,
      playerSecret: row.playerSecret,
      playerName: row.playerName,
    };
  });
}
