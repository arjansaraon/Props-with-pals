# Feature: Resolve Prop

> `POST /api/pools/[code]/props/[id]/resolve?secret=...`

Marks the correct answer for a prop, calculates points for all picks, and auto-completes the pool.

This is the most complex endpoint in Phase 1 with multiple side effects in a single transaction.

---

## Input

**URL Parameters:**
- `code` - Pool invite code
- `id` - Prop UUID
- `secret` - Captain secret (query param)

**Request Body:**
```typescript
{
  correctOptionIndex: number  // 0-based index into prop.options array
}
```

## Output

### Success (200 OK)

```typescript
{
  prop: {
    id: string,
    questionText: string,
    options: string[],
    pointValue: number,
    correctOptionIndex: number,  // Now set
    status: "active",
  },
  pool: {
    status: "completed",  // Auto-completed
  },
  pointsAwarded: [
    { participantId: string, participantName: string, pointsEarned: number },
    // ... one entry per pick on this prop
  ]
}
```

### Errors

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid correctOptionIndex (negative, out of range) |
| 400 | `ALREADY_RESOLVED` | Prop already has correctOptionIndex set |
| 401 | `UNAUTHORIZED` | Missing or invalid captain secret |
| 403 | `POOL_NOT_LOCKED` | Pool status is "open" (must lock first) |
| 403 | `POOL_LOCKED` | Pool status is "completed" (too late) |
| 404 | `POOL_NOT_FOUND` | Invalid invite code |
| 404 | `PROP_NOT_FOUND` | Invalid prop ID or prop doesn't belong to pool |

**Note:** We use two status error codes:
- `POOL_NOT_LOCKED` - pool is open, action requires locked status
- `POOL_LOCKED` - pool is locked or completed, action requires open status

---

## Business Logic

### Prerequisites (checked in order)

1. **Pool exists** - Look up by invite code → 404 `POOL_NOT_FOUND`
2. **Captain authorized** - `secret` param matches `pool.captain_secret` → 401 `UNAUTHORIZED`
3. **Pool is locked** - Status must be "locked":
   - If "open" → 403 `POOL_NOT_LOCKED`
   - If "completed" → 403 `POOL_LOCKED`
4. **Prop exists** - Look up by ID, verify it belongs to this pool → 404 `PROP_NOT_FOUND`
5. **Prop not resolved** - `correct_option_index` must be null → 400 `ALREADY_RESOLVED`
6. **Valid option index** - Must be 0 ≤ index < options.length → 400 `VALIDATION_ERROR`

### Side Effects (all in one transaction)

#### 1. Update Prop
Set `correct_option_index` to the provided value:

```typescript
await tx.update(props)
  .set({
    correct_option_index: input.correctOptionIndex,
    updated_at: new Date()
  })
  .where(eq(props.id, propId));
```

#### 2. Calculate Points for Each Pick
For every pick on this prop:

```typescript
// If pick matches correct answer → points = prop.point_value
// If pick doesn't match → points = 0

const pointsEarned = (pick.selected_option_index === correctOptionIndex)
  ? prop.point_value
  : 0;

await tx.update(picks)
  .set({
    points_earned: pointsEarned,
    updated_at: new Date()
  })
  .where(eq(picks.id, pick.id));
```

#### 3. Update Participant Totals
For each participant who made a pick on this prop, recalculate their total:

```typescript
// Sum all points_earned for this participant's picks
const total = await tx
  .select({ sum: sum(picks.points_earned) })
  .from(picks)
  .where(eq(picks.participant_id, participantId));

await tx.update(participants)
  .set({
    total_points: total.sum ?? 0,
    updated_at: new Date()
  })
  .where(eq(participants.id, participantId));
```

**Note**: We recalculate the full sum rather than incrementing, which is safer and handles edge cases.

#### 4. Auto-Complete Pool (Phase 1 specific)
In Phase 1, there's only one prop, so resolving it completes the pool:

```typescript
// Check if all props are resolved
const unresolvedCount = await tx
  .select({ count: count() })
  .from(props)
  .where(and(
    eq(props.pool_id, poolId),
    isNull(props.correct_option_index),
    eq(props.status, 'active')  // Don't count voided props
  ));

if (unresolvedCount === 0) {
  await tx.update(pools)
    .set({
      status: 'completed',
      updated_at: new Date()
    })
    .where(eq(pools.id, poolId));
}
```

---

## Points Calculation Logic

```
For each pick on the resolved prop:

  IF pick.selected_option_index === prop.correct_option_index
    THEN pick.points_earned = prop.point_value
    ELSE pick.points_earned = 0

  Participant.total_points = SUM(all their picks' points_earned)
```

**Example:**
- Prop: "Who scores first TD?" (worth 10 points)
- Options: ["Mahomes", "Kelce", "Other"]
- Correct answer: index 1 ("Kelce")

| Participant | Their Pick | Points Earned |
|-------------|-----------|---------------|
| Alice | index 1 (Kelce) | 10 |
| Bob | index 0 (Mahomes) | 0 |
| Captain | index 1 (Kelce) | 10 |

---

## Transaction Requirements

**All operations must be atomic.** If any step fails, everything rolls back.

```typescript
await db.transaction(async (tx) => {
  // 1. Validate prerequisites
  const pool = await tx.query.pools.findFirst({...});
  if (!pool) throw new ApiError(404, 'POOL_NOT_FOUND');
  if (pool.captain_secret !== secret) throw new ApiError(401, 'UNAUTHORIZED');
  if (pool.status !== 'locked') throw new ApiError(403, 'POOL_NOT_LOCKED');

  const prop = await tx.query.props.findFirst({...});
  if (!prop) throw new ApiError(404, 'PROP_NOT_FOUND');
  if (prop.correct_option_index !== null) throw new ApiError(400, 'ALREADY_RESOLVED');
  if (correctOptionIndex >= prop.options.length) throw new ApiError(400, 'VALIDATION_ERROR');

  // 2. Update prop
  await tx.update(props).set({...});

  // 3. Get all picks for this prop
  const allPicks = await tx.query.picks.findMany({
    where: eq(picks.prop_id, propId)
  });

  // 4. Update each pick's points_earned
  for (const pick of allPicks) {
    const earned = pick.selected_option_index === correctOptionIndex
      ? prop.point_value
      : 0;
    await tx.update(picks).set({ points_earned: earned, ... });
  }

  // 5. Update participant totals
  const affectedParticipantIds = [...new Set(allPicks.map(p => p.participant_id))];
  for (const participantId of affectedParticipantIds) {
    // Recalculate total from all their picks
    const total = await tx.select({...}).from(picks).where(...);
    await tx.update(participants).set({ total_points: total, ... });
  }

  // 6. Check if pool should complete
  const unresolved = await tx.select({...}).from(props).where(...);
  if (unresolved.count === 0) {
    await tx.update(pools).set({ status: 'completed', ... });
  }

  return { prop, pointsAwarded: [...] };
});
```

---

## Test Cases

### Happy Path
- [ ] Sets correct_option_index on prop
- [ ] Returns 200 status
- [ ] Response includes updated prop with correctOptionIndex

### Authorization
- [ ] Rejects missing secret → 401 UNAUTHORIZED
- [ ] Rejects wrong secret → 401 UNAUTHORIZED
- [ ] Accepts valid captain secret

### Pool Status Checks
- [ ] Rejects if pool is "open" → 403 POOL_NOT_LOCKED
- [ ] Rejects if pool is "completed" → 403 POOL_LOCKED
- [ ] Accepts if pool is "locked"

### Prop Validation
- [ ] Rejects if prop doesn't exist → 404 PROP_NOT_FOUND
- [ ] Rejects if prop belongs to different pool → 404 PROP_NOT_FOUND
- [ ] Rejects if prop already resolved → 400 ALREADY_RESOLVED
- [ ] Rejects negative correctOptionIndex → 400 VALIDATION_ERROR
- [ ] Rejects correctOptionIndex >= options.length → 400 VALIDATION_ERROR

### Points Calculation
- [ ] Correct pick earns prop.point_value points
- [ ] Incorrect pick earns 0 points
- [ ] points_earned stored on pick record
- [ ] Participant.total_points updated correctly
- [ ] Multiple participants updated correctly

### Pool Auto-Complete
- [ ] Pool status changes to "completed" after resolve
- [ ] Pool updated_at is set

### Edge Cases
- [ ] No picks on prop → resolve succeeds, no points to award
- [ ] Participant with no pick → their total unchanged
- [ ] Captain's pick is scored like any participant

---

## Files Involved

| File | Purpose |
|------|---------|
| `src/app/api/pools/[code]/props/[id]/resolve/route.ts` | API route handler |
| `src/lib/schema.ts` | Table definitions |
| `src/lib/validators.ts` | `ResolveSchema` Zod schema |
| `src/lib/points.ts` | `calculatePointsEarned()` helper (optional) |
| `src/lib/db.ts` | Database client with transaction support |

---

## Implementation Order (TDD)

1. Write tests for authorization (secret validation)
2. Write tests for pool status checks
3. Write tests for prop validation
4. Write tests for points calculation (unit tests for logic)
5. Write tests for participant total updates
6. Write tests for pool auto-complete
7. Implement API route with full transaction
8. Verify all tests pass

---

## Performance Considerations

For Phase 1 (one prop, few participants), performance isn't a concern.

For Phase 2+ with many props and participants:
- Consider batch updates instead of loops
- Could calculate totals with a single aggregate query
- May want to debounce UI updates during bulk resolves

For now, clarity > optimization.
