# Feature: Prop Creation & Editing

> Captain's ability to manage props effectively

---

## Features

1. **Fix Add Prop** - Debug why add prop isn't working
2. **Edit Props** - Edit question/options before pool locks
3. **Custom Invite Code** - Let captain choose their own invite code

---

## 1. Fix Add Prop Not Working

**Files:**
- `app/pool/[code]/captain/components/admin-tab.tsx`
- `app/api/pools/[code]/props/route.ts`

**Debug steps:**
1. Check form submission handler fires
2. Check API request is sent (Network tab)
3. Check API response for errors
4. Check if props list refreshes after add
5. Check console for errors

**Common issues:**
- Form validation preventing submit
- API route returning error
- Props list not re-fetching after mutation

---

## 2. Edit Props Before Lock

**Constraint:** Only editable when pool status is `open` (not `locked` or `completed`)

### UI Design

Add edit button to each prop card in AdminTab:

```
┌─────────────────────────────────────────┐
│ Who will score the first touchdown?  [✏️]│
│ ○ Player A                              │
│ ○ Player B                              │
│ 10 points                               │
└─────────────────────────────────────────┘
```

When editing:
```
┌─────────────────────────────────────────┐
│ Question: [___________________________] │
│ Option 1: [___________________________] │
│ Option 2: [___________________________] │
│ [+ Add Option]                          │
│ Points: [10]                            │
│ [Cancel] [Save Changes]                 │
└─────────────────────────────────────────┘
```

### API

**Endpoint:** `PATCH /api/pools/[code]/props/[id]`

**Request:**
```json
{
  "questionText": "Updated question?",
  "options": ["Option A", "Option B", "Option C"],
  "pointValue": 15
}
```

**Response:**
```json
{
  "id": "prop-id",
  "questionText": "Updated question?",
  "options": ["Option A", "Option B", "Option C"],
  "pointValue": 15,
  "updatedAt": "2026-02-05T..."
}
```

**Validation:**
- Pool must be `open` status
- Question required, non-empty
- At least 2 options
- Point value > 0
- Cannot reduce options if picks exist for removed options

### Files to Modify

| File | Changes |
|------|---------|
| `app/pool/[code]/captain/components/admin-tab.tsx` | Add edit button, inline edit mode |
| `app/api/pools/[code]/props/[id]/route.ts` | Add/verify PATCH handler |
| `src/lib/validators.ts` | Add UpdatePropSchema |

---

## 3. Customize Invite Code

Allow captain to set a custom invite code when creating a pool.

### UI Design

Add optional field to create pool form:

```
Pool Name: [Super Bowl Props        ]
Your Name: [John                    ]
Buy-in:    [$20                     ]

Custom Code (optional): [superbowl-2026    ]
Preview: props-with-pals.com/pool/superbowl-2026

[Create Pool]
```

### Validation

- **Length:** 4-20 characters
- **Characters:** Lowercase letters, numbers, hyphens only
- **Format:** Cannot start/end with hyphen, no consecutive hyphens
- **Uniqueness:** Must not already exist
- **Reserved:** Block common words (admin, api, app, etc.)

```typescript
// src/lib/validators.ts
export const InviteCodeSchema = z.string()
  .min(4, 'Code must be at least 4 characters')
  .max(20, 'Code must be at most 20 characters')
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Only lowercase letters, numbers, and hyphens')
  .refine(code => !RESERVED_CODES.includes(code), 'This code is reserved');

const RESERVED_CODES = ['admin', 'api', 'app', 'pool', 'pools', 'join', 'create'];
```

### API Changes

**Endpoint:** `POST /api/pools`

**Updated request:**
```json
{
  "name": "Super Bowl Props",
  "captainName": "John",
  "buyInAmount": "$20",
  "inviteCode": "superbowl-2026"  // Optional - auto-generate if not provided
}
```

**Error responses:**
- `400` - Invalid code format
- `409` - Code already in use

### Files to Modify

| File | Changes |
|------|---------|
| `app/page.tsx` | Add custom invite code input field |
| `app/api/pools/route.ts` | Accept custom code, validate uniqueness |
| `src/lib/validators.ts` | Add InviteCodeSchema, update CreatePoolSchema |

---

## Implementation Order

1. Fix Add Prop (debug existing)
2. Edit Props (new feature)
3. Custom Invite Code (new feature)

---

## Testing

### Add Prop
- Create pool, add prop, verify it appears in list
- Check API response in Network tab

### Edit Props
- Edit question text, save, verify updated
- Edit options, save, verify updated
- Try to edit when pool is locked (should fail)
- Cancel edit, verify original restored

### Custom Invite Code
- Create pool with custom code, verify URL uses it
- Try duplicate code, verify error
- Try invalid format, verify validation error
- Leave blank, verify auto-generated code

---

*Status: Ready for implementation*
