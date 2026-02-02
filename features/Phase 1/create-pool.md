# Feature: Create Pool

> `POST /api/pools`

Creates a new pool and automatically adds the captain as the first participant.

---

## Input

```typescript
{
  name: string,        // Pool name (1-100 chars)
  captainName: string, // Captain's display name (1-50 chars)
  buyInAmount?: string // Optional, informational (1-20 chars, e.g., "$20")
}
```

## Output

### Success (201 Created)

```typescript
{
  id: string,           // UUID
  name: string,
  inviteCode: string,   // 6 chars (A-Z, 2-9)
  captainName: string,
  captainSecret: string, // UUID - ONLY returned on create
  status: "open",
  createdAt: string,    // ISO timestamp
}
```

### Errors

| Status | Code | When |
|--------|------|------|
| 400 | `VALIDATION_ERROR` | Missing/invalid name or captainName |

---

## Business Logic

### 1. Generate Invite Code
- 6 characters from allowed set: `ABCDEFGHJKMNPQRSTUVWXYZ23456789`
- Excludes ambiguous: `0, 1, O, I, L`
- Must be unique (let DB constraint fail if collision - rare)

### 2. Generate Captain Secret
- UUID via `crypto.randomUUID()`
- Used for all captain actions AND captain's own picks

### 3. Create Pool Record
```typescript
{
  id: crypto.randomUUID(),
  name: input.name,
  invite_code: generatedCode,
  buy_in_amount: input.buyInAmount ?? null,
  captain_name: input.captainName,
  captain_secret: generatedSecret,
  status: "open",  // Skip draft for Phase 1
  created_at: new Date(),
  updated_at: new Date(),
}
```

### 4. Create Captain as Participant
In the **same transaction**, create participant:

```typescript
{
  id: crypto.randomUUID(),
  pool_id: pool.id,
  name: input.captainName,
  secret: generatedSecret,  // SAME as captain_secret
  total_points: 0,
  paid: null,
  status: "active",
  joined_at: new Date(),
  updated_at: new Date(),
}
```

**Key point**: Captain's `participant.secret` = `captain_secret`. This allows the captain to use one secret for everything.

### 5. Return Response
- Include `captainSecret` in response (only time it's returned)
- Frontend redirects to `/pool/{inviteCode}/captain?secret={captainSecret}`

---

## Transaction Requirements

Both inserts must succeed or both must fail:

```typescript
await db.transaction(async (tx) => {
  const pool = await tx.insert(pools).values({...}).returning();
  await tx.insert(participants).values({
    pool_id: pool.id,
    secret: pool.captain_secret,  // Same secret
    ...
  });
  return pool;
});
```

If participant insert fails (shouldn't happen), pool insert is rolled back.

---

## Test Cases

### Happy Path
- [ ] Creates pool with valid name and captainName
- [ ] Returns 201 status
- [ ] Response includes id, inviteCode, captainSecret
- [ ] Invite code is 6 chars, only allowed characters
- [ ] Status is "open"
- [ ] Captain secret is UUID format

### Captain as Participant
- [ ] Participant record created with captain's name
- [ ] Participant secret equals captain_secret
- [ ] Participant total_points is 0
- [ ] Participant status is "active"

### Validation
- [ ] Rejects empty name → 400 VALIDATION_ERROR
- [ ] Rejects name > 100 chars → 400 VALIDATION_ERROR
- [ ] Rejects empty captainName → 400 VALIDATION_ERROR
- [ ] Rejects captainName > 50 chars → 400 VALIDATION_ERROR
- [ ] Accepts missing buyInAmount (optional)
- [ ] Accepts valid buyInAmount string (1-20 chars)
- [ ] Rejects buyInAmount > 20 chars → 400 VALIDATION_ERROR

### Edge Cases
- [ ] Invite code collision → 500 (acceptable for Phase 1, retry in Phase 3)
- [ ] buyInAmount > 20 chars → 400 VALIDATION_ERROR

---

## Files Involved

| File | Purpose |
|------|---------|
| `src/app/api/pools/route.ts` | API route handler |
| `src/lib/schema.ts` | Pool and Participant table definitions |
| `src/lib/validators.ts` | `CreatePoolSchema` Zod schema |
| `src/lib/invite-code.ts` | `generateInviteCode()` function |
| `src/lib/db.ts` | Database client |

---

## Implementation Order (TDD)

1. Write test: valid input creates pool
2. Write test: captain added as participant with same secret
3. Write test: validation rejects bad input
4. Implement `generateInviteCode()` (already has its own tests)
5. Implement `CreatePoolSchema` validator
6. Implement API route with transaction
7. Verify all tests pass
