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
| `invite_code` | string(6) | Yes | Unique code for joining |
| `buy_in_amount` | string | No | Informational (e.g., "$20") |
| `captain_name` | string | Yes | Who created it |
| `captain_secret` | string | Yes | For captain access |
| `status` | enum | Yes | draft, open, locked, completed |
| `lock_at` | timestamp | No | Scheduled auto-lock time |
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
- One pick per participant per prop (unique constraint on participant_id + prop_id)
- Props belong to exactly one pool
- Participants belong to exactly one pool

## Database Indexes

| Table | Index | Purpose |
|-------|-------|---------|
| Pool | `invite_code` (unique) | Fast pool lookup by code |
| Prop | `pool_id` | Get all props for a pool |
| Prop | `pool_id, order` | Get props in display order |
| Participant | `pool_id` | Get all participants for a pool |
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
| Captain | `invite_code` + `captain_secret` | Everything for their pool |
| Participant | `pool_id` + `secret` | View props, submit picks, view leaderboard |
| Anonymous | `invite_code` only | See pool exists, join as new participant |

**Notes:**
- Secrets stored as plain strings (not hashed) - acceptable for low-stakes friend app
- Secrets passed via URL params or stored in cookies
- Picks hidden from other participants until pool status = locked

## Future-Proofing Fields

These nullable fields support future features without migrations:

| Field | Future Feature |
|-------|----------------|
| `Pool.lock_at` | Scheduled auto-lock |
| `Prop.category` | Prop grouping/sections |
| `Participant.paid` | Payment tracking |
| `Prop.status` | Void/nullify props |
| `Participant.status` | Remove participants |

---

## Technical Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Database | SQLite | Simple, no server needed, easy backup |
| IDs | UUIDs | No sequential guessing, globally unique |
| Options storage | JSON array | Flexible, simple queries |
| Points calculation | Stored + calculated | `points_earned` on Pick, `total_points` on Participant updated on resolve |

---

**Next Step**: Choose SQLite library and begin implementation
