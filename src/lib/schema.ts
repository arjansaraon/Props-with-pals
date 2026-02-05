import { sqliteTable, text, integer, uniqueIndex, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// Pool status enum values
export const poolStatusValues = ['open', 'locked', 'completed'] as const;
export type PoolStatus = (typeof poolStatusValues)[number];

// Prop status enum values
export const propStatusValues = ['active', 'voided'] as const;
export type PropStatus = (typeof propStatusValues)[number];

// Player status enum values
export const playerStatusValues = ['active', 'removed'] as const;
export type PlayerStatus = (typeof playerStatusValues)[number];

// ============================================
// POOLS TABLE
// ============================================
export const pools = sqliteTable('pools', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  inviteCode: text('invite_code').notNull().unique(),
  buyInAmount: text('buy_in_amount'),
  captainName: text('captain_name').notNull(),
  captainSecret: text('captain_secret').notNull(),
  status: text('status', { enum: poolStatusValues }).notNull().default('open'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
});

// ============================================
// PROPS TABLE
// ============================================
export const props = sqliteTable('props', {
  id: text('id').primaryKey(),
  poolId: text('pool_id').notNull().references(() => pools.id),
  questionText: text('question_text').notNull(),
  options: text('options', { mode: 'json' }).notNull().$type<string[]>(),
  pointValue: integer('point_value').notNull(),
  correctOptionIndex: integer('correct_option_index'),
  category: text('category'),
  status: text('status', { enum: propStatusValues }).notNull().default('active'),
  order: integer('order').notNull(),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  index('idx_props_pool').on(table.poolId),
  index('idx_props_pool_order').on(table.poolId, table.order),
]);

// ============================================
// PLAYERS TABLE
// ============================================
export const players = sqliteTable('players', {
  id: text('id').primaryKey(),
  poolId: text('pool_id').notNull().references(() => pools.id),
  name: text('name').notNull(),
  secret: text('secret').notNull(),
  totalPoints: integer('total_points').notNull().default(0),
  paid: integer('paid', { mode: 'boolean' }),
  status: text('status', { enum: playerStatusValues }).notNull().default('active'),
  joinedAt: text('joined_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex('idx_players_pool_name').on(table.poolId, table.name),
  index('idx_players_pool').on(table.poolId),
  index('idx_players_pool_secret').on(table.poolId, table.secret),
]);

// ============================================
// PICKS TABLE
// ============================================
export const picks = sqliteTable('picks', {
  id: text('id').primaryKey(),
  playerId: text('player_id').notNull().references(() => players.id),
  propId: text('prop_id').notNull().references(() => props.id),
  selectedOptionIndex: integer('selected_option_index').notNull(),
  pointsEarned: integer('points_earned'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
  updatedAt: text('updated_at').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => [
  uniqueIndex('idx_picks_player_prop').on(table.playerId, table.propId),
  index('idx_picks_player').on(table.playerId),
  index('idx_picks_prop').on(table.propId),
]);

// ============================================
// RELATIONS
// ============================================
export const poolsRelations = relations(pools, ({ many }) => ({
  props: many(props),
  players: many(players),
}));

export const propsRelations = relations(props, ({ one, many }) => ({
  pool: one(pools, {
    fields: [props.poolId],
    references: [pools.id],
  }),
  picks: many(picks),
}));

export const playersRelations = relations(players, ({ one, many }) => ({
  pool: one(pools, {
    fields: [players.poolId],
    references: [pools.id],
  }),
  picks: many(picks),
}));

export const picksRelations = relations(picks, ({ one }) => ({
  player: one(players, {
    fields: [picks.playerId],
    references: [players.id],
  }),
  prop: one(props, {
    fields: [picks.propId],
    references: [props.id],
  }),
}));

// ============================================
// TYPE EXPORTS
// ============================================
export type Pool = typeof pools.$inferSelect;
export type NewPool = typeof pools.$inferInsert;

export type Prop = typeof props.$inferSelect;
export type NewProp = typeof props.$inferInsert;

export type Player = typeof players.$inferSelect;
export type NewPlayer = typeof players.$inferInsert;

export type Pick = typeof picks.$inferSelect;
export type NewPick = typeof picks.$inferInsert;
