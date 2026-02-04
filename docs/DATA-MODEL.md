# Data Model: Props-With-Pals

> **Status**: Finalized for MVP

## Overview

The data model centers around **Pools** containing **Props** (questions), with **Participants** submitting **Picks**.

## Entities

### Pool

The main container for a betting event.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier |
| `name` | string | Yes | Pool name (e.g., "Super Bowl 2026") |
| `description` | string | No | Optional description of the pool |
| `invite_code` | string(6) | Yes | Unique code for joining (A-Z, 2-9, no ambiguous chars) |
| `buy_in_amount` | string | No | Informational (e.g., "$20") |
| `captain_name` | string | Yes | Who created it |
| `captain_secret` | string | Yes | For captain access |
| `status` | enum | Yes | draft, open, locked, completed |
| `created_at` | timestamp | Yes | When pool was created |
| `updated_at` | timestamp | Yes | Last modification |

### Prop

A multiple-choice question within a pool.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier |
| `pool_id` | string (FK) | Yes | Parent pool |
| `question_text` | string | Yes | The question (e.g., "Who scores first TD?") |
| `options` | JSON array | Yes | Array of choice strings |
| `point_value` | integer | Yes | Points for correct answer |
| `correct_option_index` | integer | No | Index of correct answer (null until resolved) |
| `category` | string | No | Group props by category (e.g., "1st Quarter") |
| `status` | enum | Yes | active, voided |
| `order` | integer | Yes | Display order |
| `created_at` | timestamp | Yes | When prop was created |
| `updated_at` | timestamp | Yes | Last modification |

### Participant

Someone who joins a pool.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier |
| `pool_id` | string (FK) | Yes | Parent pool |
| `name` | string | Yes | Display name |
| `secret` | string | Yes | For accessing their picks |
| `total_points` | integer | Yes | Calculated score (default 0) |
| `paid` | boolean | No | Payment tracking (default null) |
| `status` | enum | Yes | active, removed |
| `joined_at` | timestamp | Yes | When participant joined |
| `updated_at` | timestamp | Yes | Last modification |

### Pick

A participant's answer to a prop.

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string (UUID) | Yes | Unique identifier |
| `participant_id` | string (FK) | Yes | Who made the pick |
| `prop_id` | string (FK) | Yes | Which prop |
| `selected_option_index` | integer | Yes | Index of selected option |
| `points_earned` | integer | No | Points earned (null until prop resolved) |
| `created_at` | timestamp | Yes | When pick was made |
| `updated_at` | timestamp | Yes | Last modification |

## Relationships

```
Pool (1) ──── (many) Prop
Pool (1) ──── (many) Participant
Participant (1) ──── (many) Pick
Prop (1) ──── (many) Pick
```

**Constraints:**
- One pick per participant per prop (unique constraint on `participant_id` + `prop_id`)
- Props belong to exactly one pool
- Participants belong to exactly one pool
- Participant names must be unique within a pool (unique constraint on `pool_id` + `name`, error: "Name already taken")
- Captain is auto-added as a participant when pool is created

## Database Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| Pool | `invite_code` (unique) | Fast pool lookup by code |
| Prop | `pool_id` | Get all props for a pool |
| Prop | `pool_id, order` | Get props in display order |
| Participant | `pool_id` | Get all participants for a pool |
| Participant | `pool_id, name` (unique) | Enforce unique names per pool |
| Participant | `pool_id, secret` | Auth participant |
| Pick | `participant_id` | Get all picks by participant |
| Pick | `prop_id` | Get all picks for a prop |
| Pick | `participant_id, prop_id` (unique) | One pick per prop per participant |

## Key Queries

### Captain Queries
- Get pool by `invite_code` + verify `captain_secret`
- Get all props for a pool (ordered by `order`)
- Get all participants for a pool (where status = active)
- Get all picks for a prop (for results display, after lock)
- Update `correct_option_index` and calculate `points_earned` for all picks

### Participant Queries
- Get pool by `invite_code`
- Get/create participant by `pool_id` + `secret`
- Get my picks for a pool
- Submit/update picks (before lock)

### Leaderboard Queries
- Get participants ranked by `total_points` DESC
- Include count of correct picks per participant

## Status Flows

### Pool Status
```
draft → open → locked → completed
  │       │       │         │
  │       │       │         └── All props resolved, final standings
  │       │       └── No more picks allowed, captain marking results
  │       └── Participants can join and submit picks
  └── Captain setting up props (not visible to participants)
```

### Prop Status
```
active → voided
   │        │
   │        └── Captain nullified (e.g., unclear outcome)
   └── Normal prop, will be scored
```

### Participant Status
```
active → removed
   │        │
   │        └── Captain removed from pool
   └── Normal participant
```

## Security Model

| Actor | Identified By | Can Do |
|-------|---------------|--------|
| Captain | `invite_code` + `captain_secret` | Everything for their pool (admin + their own picks) |
| Participant | `invite_code` + `participant.secret` | View props, submit picks, view leaderboard |
| Anonymous | `invite_code` only | See pool exists, join as new participant |

**Notes:**
- Captain uses `captain_secret` for both admin actions AND their own picks (one URL to save)
- Secrets are UUIDs generated with `crypto.randomUUID()`
- Secrets stored as plain strings (not hashed) - acceptable for low-stakes friend app
- Phase 1: Secrets passed via URL params only (no localStorage)
- Phase 2+: Secrets persisted in localStorage
- Picks hidden from other participants (Phase 3: visible after lock)

**URL Structure:**
- Join pool: `/pool/{invite_code}` - anyone can join
- Captain dashboard: `/pool/{invite_code}/captain?secret={captain_secret}` - includes captain's picks
- Participant view: `/pool/{invite_code}/picks?secret={participant_secret}`
- Shareable participant link includes their secret (Phase 3: easy copy/share)

## Future-Proofing Fields

These nullable fields support future features without migrations:

| Field | Future Feature |
|-------|----------------|
| `Pool.lock_at` | Scheduled auto-lock (add field when implementing) |
| `Prop.category` | Prop grouping/sections |
| `Participant.paid` | Payment tracking |
| `Prop.status` | Void/nullify props |
| `Participant.status` | Remove participants |

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | Turso (SQLite-compatible) | Serverless-native, works with Vercel |
| ORM | Drizzle | TypeScript-first, works with Turso |
| IDs | UUIDs | No sequential guessing, globally unique |
| Secrets | UUIDs | Same format as IDs, `crypto.randomUUID()` |
| Invite codes | 6 chars, A-Z + 2-9 (no 0,1,O,I,L) | 32^6 = 1B+ combinations, easy to read/type |
| Options storage | JSON array | Flexible, simple queries |
| Points calculation | Stored + calculated | `points_earned` on Pick, `total_points` on Participant updated on resolve |
| Captain participation | Auto-added as participant | Simplest - captain can play too |
| Captain auth | Same secret for both roles | Captain uses `captain_secret` for admin and picks |
| Duplicate picks | Overwrite existing | Allows changing mind before lock |

