# Feature: Leaderboard Polish

> Final polish for the leaderboard experience

---

## Features

1. **Captain badge** - Show who's the captain
2. **Clickable row indicators** - Make it clear rows are clickable
3. **Hide scores until resolved** - No scores/medals until first prop resolved

---

## 1. Captain Badge

**File:** `app/pool/[code]/leaderboard/page.tsx`

Show a badge next to the captain's name in the leaderboard.

### Implementation

The captain can be identified by comparing `player.name` with `pool.captainName`:

```tsx
<TableCell>
  <div className="flex items-center gap-2">
    {player.name}
    {player.name === pool.captainName && (
      <Badge variant="secondary" className="text-xs">Captain</Badge>
    )}
  </div>
</TableCell>
```

**Note:** If multiple players have the same name as captain, only show badge for the one whose secret matches `pool.captainSecret`. May need to pass `isCaptain` from API.

---

## 2. Clickable Row Indicators

**File:** `app/pool/[code]/leaderboard/page.tsx`

Currently, rows are clickable only when pool is locked/completed, but there's no visual indication.

### When pool is open:
- Rows NOT clickable
- Normal cursor
- Optional: subtle message "View picks available after pool locks"

### When pool is locked/completed:
- Rows ARE clickable (link to `/pool/[code]/player/[id]`)
- Pointer cursor
- Hover effect (highlight row)
- Optional: chevron icon on right side

```tsx
const isClickable = pool.status !== 'open';

<TableRow
  className={cn(
    isClickable && "cursor-pointer hover:bg-muted/50 transition-colors"
  )}
>
  {isClickable ? (
    <Link href={`/pool/${code}/player/${player.id}`} className="contents">
      {/* row content */}
      <TableCell className="text-right">
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </TableCell>
    </Link>
  ) : (
    /* row content without link */
  )}
</TableRow>
```

### Helper text for open pools:
```tsx
{pool.status === 'open' && (
  <p className="text-sm text-muted-foreground text-center mt-4">
    View other players' picks after the pool locks
  </p>
)}
```

---

## 3. Hide Scores Until First Prop Resolved

**File:** `app/pool/[code]/leaderboard/page.tsx`

Scores are meaningless until at least one prop has been resolved.

### Detection

Check if any prop has `correctOptionIndex !== null`:

```typescript
const hasResolvedProps = props.some(prop => prop.correctOptionIndex !== null);
```

### Display Logic

| Condition | Points Column | Medals |
|-----------|---------------|--------|
| No props resolved | "—" | Hidden |
| Props resolved | Actual score | Show 🥇🥈🥉 |

```tsx
{hasResolvedProps ? (
  <>
    {rank === 1 && '🥇 '}
    {rank === 2 && '🥈 '}
    {rank === 3 && '🥉 '}
  </>
) : null}

<TableCell className="text-right font-medium">
  {hasResolvedProps ? player.totalPoints : '—'}
</TableCell>
```

### Optional message:
```tsx
{!hasResolvedProps && (
  <p className="text-sm text-muted-foreground text-center mt-4">
    Scores will appear once answers are revealed
  </p>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/pool/[code]/leaderboard/page.tsx` | Captain badge, clickable indicators, conditional scores |

---

## Data Requirements

The leaderboard page may need additional data:

1. **Captain identification** - Either `pool.captainName` or `player.isCaptain` flag
2. **Props list** - To check if any are resolved (may already be fetched)

If props aren't available, add to the API response or make a separate check:
```typescript
// Option 1: Extend leaderboard API
GET /api/pools/[code]/leaderboard
Response: { players: [...], hasResolvedProps: true }

// Option 2: Check props separately
const props = await fetch(`/api/pools/${code}/props`);
const hasResolvedProps = props.some(p => p.correctOptionIndex !== null);
```

---

## Testing

1. **Captain badge:**
   - Create pool as "John", verify "John" has Captain badge
   - Join as "Jane", verify no badge on "Jane"

2. **Clickable rows:**
   - Open pool: verify rows not clickable, no hover effect
   - Lock pool: verify rows clickable, hover effect, chevron visible
   - Click row: verify navigates to player picks view

3. **Scores hidden:**
   - Create pool with props, no resolutions: verify "—" and no medals
   - Resolve one prop: verify scores and medals appear
   - Verify message appears when no props resolved

---

*Status: Ready for implementation*
