import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { sql } from 'drizzle-orm';
import * as schema from './schema';
import { randomUUID } from 'crypto';
import { existsSync, unlinkSync } from 'fs';

/**
 * Sets up the test database with the schema.
 * Uses a temporary file-based database for reliable testing.
 * Call this in beforeEach to get a fresh database for each test.
 */
export async function setupTestDb() {
  // Create a unique temp file for this test
  const dbPath = `/tmp/test-${randomUUID()}.db`;

  const client = createClient({
    url: `file:${dbPath}`,
  });

  const db = drizzle(client, { schema });

  // Create tables using drizzle's sql template
  await db.run(sql`
    CREATE TABLE IF NOT EXISTS pools (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      invite_code TEXT NOT NULL UNIQUE,
      buy_in_amount TEXT,
      captain_name TEXT NOT NULL,
      captain_secret TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'open',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS props (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      question_text TEXT NOT NULL,
      options TEXT NOT NULL,
      point_value INTEGER NOT NULL,
      correct_option_index INTEGER,
      category TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      "order" INTEGER NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS players (
      id TEXT PRIMARY KEY,
      pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      secret TEXT NOT NULL,
      total_points INTEGER NOT NULL DEFAULT 0,
      paid INTEGER,
      status TEXT NOT NULL DEFAULT 'active',
      joined_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS picks (
      id TEXT PRIMARY KEY,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      prop_id TEXT NOT NULL REFERENCES props(id) ON DELETE CASCADE,
      selected_option_index INTEGER NOT NULL,
      points_earned INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    )
  `);

  await db.run(sql`
    CREATE TABLE IF NOT EXISTS recovery_tokens (
      id TEXT PRIMARY KEY,
      token TEXT NOT NULL UNIQUE,
      player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
      pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
      expires_at TEXT NOT NULL,
      used_at TEXT,
      created_at TEXT NOT NULL
    )
  `);

  // Create indexes
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_players_pool_name ON players(pool_id, name)`);
  await db.run(sql`CREATE UNIQUE INDEX IF NOT EXISTS idx_picks_participant_prop ON picks(player_id, prop_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_props_pool ON props(pool_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_players_pool ON players(pool_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_players_pool_secret ON players(pool_id, secret)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_picks_participant ON picks(player_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_picks_prop ON picks(prop_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_recovery_tokens_token ON recovery_tokens(token)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_recovery_tokens_pool ON recovery_tokens(pool_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_recovery_tokens_player ON recovery_tokens(player_id)`);
  await db.run(sql`CREATE INDEX IF NOT EXISTS idx_recovery_tokens_expires ON recovery_tokens(expires_at)`);

  // Cleanup function to delete the temp file
  const cleanup = () => {
    if (existsSync(dbPath)) {
      try {
        unlinkSync(dbPath);
      } catch {
        // Ignore cleanup errors
      }
    }
  };

  return { db, client, cleanup, dbPath };
}
