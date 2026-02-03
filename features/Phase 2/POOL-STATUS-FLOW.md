# Feature: Pool Status Flow

> Add draft state and define clear transitions between pool statuses

---

## Current State (Phase 1)

**Statuses:** `open` → `locked` → `completed`

**Flow:**
1. Pool created in `open` status
2. Captain locks pool (`open` → `locked`)
3. Captain resolves all props (`locked` → `completed`)

**Problem:** No way to set up props before inviting people

---

## Target State (Phase 2)

**Statuses:** `draft` → `open` → `locked` → `completed`

**Flow:**
1. Pool created in `draft` status
2. Captain adds/edits props in draft
3. Captain opens pool (`draft` → `open`)
4. Participants can join and pick
5. Captain locks pool (`open` → `locked`)
6. Captain resolves props (`locked` → `completed`)

---

## Status Definitions

| Status | Captain Can | Participant Can |
|--------|-------------|-----------------|
| `draft` | Add/edit/delete props, edit pool details | Nothing (can't see pool) |
| `open` | Edit prop text (typos), lock pool, view participants | Join, view props, submit picks |
| `locked` | Resolve props, view picks | View props, view picks, view leaderboard |
| `completed` | View everything | View everything |

---

## State Machine

```
                    ┌─────────┐
                    │  draft  │
                    └────┬────┘
                         │ openPool()
                         ▼
                    ┌─────────┐
         join() ───▶│  open   │◀─── submitPick()
                    └────┬────┘
                         │ lockPool()
                         ▼
                    ┌─────────┐
    resolveProp() ─▶│ locked  │
                    └────┬────┘
                         │ (auto when all resolved)
                         ▼
                    ┌──────────┐
                    │completed │
                    └──────────┘
```

---

## API Changes

### Pool Creation

**Before:**
```typescript
// Pool created with status: 'open'
```

**After:**
```typescript
// Pool created with status: 'draft'
// Captain must explicitly open
```

### New Transition: draft → open

```typescript
// PATCH /api/pools/[code]
// Body: { status: 'open' }
// Requires: captain_secret
// Validation: Pool must be in 'draft' status
// Validation: Pool must have at least 1 prop
```

### Updated Endpoint Permissions

| Endpoint | draft | open | locked | completed |
|----------|-------|------|--------|-----------|
| `GET /api/pools/[code]` | Captain only | Anyone | Anyone | Anyone |
| `POST /api/pools/[code]/props` | ✅ | ❌ | ❌ | ❌ |
| `PATCH /api/pools/[code]/props/[id]` | ✅ (full) | ✅ (text only) | ❌ | ❌ |
| `DELETE /api/pools/[code]/props/[id]` | ✅ | ❌ | ❌ | ❌ |
| `POST /api/pools/[code]/join` | ❌ | ✅ | ❌ | ❌ |
| `POST /api/pools/[code]/picks` | ❌ | ✅ | ❌ | ❌ |
| `PATCH /api/pools/[code]` (lock) | ❌ | ✅ | ❌ | ❌ |
| `POST /api/pools/.../resolve` | ❌ | ❌ | ✅ | ❌ |

---

## Decisions (Confirmed)

### 1. Prop editing after pool is open: Text-only edits allowed
- Can fix typos in question text
- Cannot change options (would invalidate picks)
- Cannot edit after pool is locked

### 2. Minimum props to open: At least 1 required
- Prevents confusing empty pool state
- Simple validation check on open transition

### 3. Draft pool visibility: Captain only
- Draft pools return 404 for non-captains
- Prevents confusion if someone tries invite code early

### 4. Invite code in draft: Yes, show it
- Captain can prepare invite message before opening
- Displayed with note: "Share after opening the pool"

### 5. Adding props after open: No
- Captain must finalize props before opening
- Keeps experience predictable for participants
- Consider adding in Phase 3 if needed

---

## UI Changes

### Captain Dashboard

**In Draft:**
```
┌─────────────────────────────────────┐
│ Pool: Super Bowl Props              │
│ Status: DRAFT                       │
│                                     │
│ Invite Code: ABC123                 │
│ (Share this after opening the pool) │
│                                     │
│ Props (2):                          │
│ ├─ Who wins the coin toss? [Edit]   │
│ └─ MVP? [Edit]                      │
│                                     │
│ [+ Add Prop]                        │
│                                     │
│ [Open Pool →]                       │
│ (Participants can join after open)  │
└─────────────────────────────────────┘
```

**In Open:**
```
┌─────────────────────────────────────┐
│ Pool: Super Bowl Props              │
│ Status: OPEN                        │
│                                     │
│ Invite Code: ABC123 [Copy]          │
│ Share: propsWithPals.com/j/ABC123   │
│                                     │
│ Participants (3):                   │
│ ├─ Alice (captain)                  │
│ ├─ Bob                              │
│ └─ Carol                            │
│                                     │
│ Props (2):                          │
│ ├─ Who wins the coin toss?          │
│ └─ MVP?                             │
│                                     │
│ [Lock Pool 🔒]                      │
│ (No more joins or picks after lock) │
└─────────────────────────────────────┘
```

### Join Flow

**Draft pool (404):**
```
Pool not found.
Check your invite code and try again.
```

**Open pool:**
```
Join: Super Bowl Props
Enter your name: [________]
[Join Pool]
```

**Locked/Completed pool:**
```
This pool is no longer accepting new participants.
[View Leaderboard]
```

---

## Implementation Plan

### 1. Schema Changes

None needed - `status` enum already includes all values.

### 2. API Updates

```typescript
// POST /api/pools - Change default status
status: 'draft',  // was: 'open'

// PATCH /api/pools/[code] - Add open transition
if (body.status === 'open' && pool.status === 'draft') {
  // Validate: has at least 1 prop
  const propCount = await db.select().from(props).where(eq(props.poolId, pool.id));
  if (propCount.length === 0) {
    return { error: 'Add at least one prop before opening' };
  }
}

// GET /api/pools/[code] - Hide draft pools from non-captains
if (pool.status === 'draft') {
  // Only captain can see
  if (secret !== pool.captainSecret) {
    return { error: 'Pool not found' }; // Intentionally vague
  }
}

// POST /api/pools/[code]/join - Block if draft
if (pool.status === 'draft') {
  return { error: 'Pool not found' };
}

// POST /api/pools/[code]/props - Only in draft
if (pool.status !== 'draft') {
  return { error: 'Cannot add props after pool is open' };
}
```

### 3. UI Updates

- Captain dashboard: Show different actions per status
- Add "Open Pool" button in draft
- Add prop editing UI (only in draft)
- Join page: Handle draft/locked states

---

## Testing Plan

### Unit Tests

- Pool creation sets `draft` status
- `draft` → `open` requires at least 1 prop
- `draft` → `open` transition works
- Cannot add props when `open`
- Cannot join when `draft`
- Cannot join when `locked`

### Integration Tests

- Full flow: create (draft) → add props → open → join → pick → lock → resolve
- Error cases: try to join draft pool, try to add prop to open pool

---

## Migration

**Existing pools:** None in production yet (Phase 1 not deployed)

**If we had existing pools:**
- Existing `open` pools stay `open`
- No migration needed

---

## Files to Modify

- `app/api/pools/route.ts` - Default to draft
- `app/api/pools/[code]/route.ts` - Add open transition, hide draft
- `app/api/pools/[code]/props/route.ts` - Block if not draft
- `app/api/pools/[code]/join/route.ts` - Block if draft
- `app/pool/[code]/captain/page.tsx` - Status-based UI
- `app/pool/[code]/page.tsx` - Handle draft/locked

---

*Status: Ready for implementation*
