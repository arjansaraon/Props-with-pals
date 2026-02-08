# Feature: Header & Navigation Polish

> Quick fixes to improve captain and player page headers

---

## Current Issues

1. **Tooltip not rendering** - Code exists but doesn't display on hover
2. **Duplicate "+" on Add Prop** - Shows `[+ icon] + Add Prop` (icon AND text "+")
3. **Pool status buried** - Status badge is inside AdminTab, not in page header
4. **Single share button** - Only "Copy Link", need separate captain link + invite link
5. **Leaderboard button plain** - Missing arrow icon, not prominent enough
6. **Redundant warning** - "Save this URL" alert at bottom is unnecessary with copy button

---

## Fixes

### 1. Fix Tooltip Rendering

**File:** `app/pool/[code]/captain/page.tsx`

**Debug steps:**
1. Check if `TooltipProvider` wraps the tooltip correctly
2. Verify Radix UI tooltip CSS is loaded
3. Check z-index conflicts with other elements
4. Test with `delayDuration={0}` to rule out timing issues

**Potential fix:** Move `TooltipProvider` higher in component tree or wrap entire page.

---

### 2. Remove Duplicate "+"

**File:** `app/pool/[code]/captain/components/admin-tab.tsx` (line ~210)

```tsx
// Before (bug):
<Plus className="h-4 w-4 mr-2" />
+ Add Prop

// After (fix):
<Plus className="h-4 w-4 mr-2" />
Add Prop
```

---

### 3. Move Pool Status to Header

**Files:**
- `app/pool/[code]/captain/page.tsx` - Add status row to header
- `app/pool/[code]/captain/components/admin-tab.tsx` - Remove status row, add heading
- `app/components/pool-status-action.tsx` - NEW client component

**Decision:** Create a small client component for the status action (badge + button). This keeps the page mostly server-rendered while adding an interactive island for Lock/Complete actions.

**New header layout:**
```
[Pool Name]                    [Status Badge] [Lock/Complete Button]
Captain: X • Buy-in: $Y • Created: Z
[My link] [Share pool] [? tooltip]           [View Leaderboard →]
```

**New client component:** `app/components/pool-status-action.tsx`
```tsx
'use client';

import { useState } from 'react';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Spinner } from '@/app/components/spinner';
import { Lock, Trophy } from 'lucide-react';

interface PoolStatusActionProps {
  code: string;
  initialStatus: 'open' | 'locked' | 'completed';
  onStatusChange?: (newStatus: string) => void;
}

export function PoolStatusAction({ code, initialStatus, onStatusChange }: PoolStatusActionProps) {
  const [status, setStatus] = useState(initialStatus);
  const [isLoading, setIsLoading] = useState(false);

  const statusConfig = {
    open: { label: 'Open', variant: 'success' as const },
    locked: { label: 'Locked', variant: 'warning' as const },
    completed: { label: 'Completed', variant: 'info' as const },
  };

  const handleLock = async () => {
    setIsLoading(true);
    const res = await fetch(`/api/pools/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'locked' }),
    });
    if (res.ok) {
      setStatus('locked');
      onStatusChange?.('locked');
    }
    setIsLoading(false);
  };

  const handleComplete = async () => {
    setIsLoading(true);
    const res = await fetch(`/api/pools/${code}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'completed' }),
    });
    if (res.ok) {
      setStatus('completed');
      onStatusChange?.('completed');
    }
    setIsLoading(false);
  };

  const current = statusConfig[status];

  return (
    <div className="flex items-center gap-3">
      <Badge variant={current.variant}>{current.label}</Badge>
      {status === 'open' && (
        <Button onClick={handleLock} disabled={isLoading} size="sm" className="bg-amber-600 hover:bg-amber-700">
          {isLoading ? <Spinner size="sm" /> : <Lock className="h-4 w-4 mr-1" />}
          Lock Pool
        </Button>
      )}
      {status === 'locked' && (
        <Button onClick={handleComplete} disabled={isLoading} size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          {isLoading ? <Spinner size="sm" /> : <Trophy className="h-4 w-4 mr-1" />}
          Complete Pool
        </Button>
      )}
    </div>
  );
}
```

**Usage in page.tsx header:**
```tsx
<div className="flex justify-between items-start">
  <CardTitle className="text-2xl">{pool.name}</CardTitle>
  <PoolStatusAction code={code} initialStatus={pool.status} />
</div>
```

**AdminTab changes:** Remove status row (lines 82-117), add simple heading:
```tsx
<h2 className="text-lg font-semibold mb-4">Manage Props</h2>
```

---

### 4. Two Share Buttons

**File:** `app/pool/[code]/captain/page.tsx`

Replace single copy button with two:

| Button | Label | URL | Purpose |
|--------|-------|-----|---------|
| Primary | "My link" | `/pool/{code}/captain?secret={secret}` | Captain's management link (keep private) |
| Secondary | "Share pool" | `/pool/{code}` | Join page for players (share this!) |

**Note:** `/pool/{code}` is the join page where players enter their name to join. This is the correct URL for "Share pool".

```tsx
<div className="flex gap-2">
  <CopyLinkButton
    url={`${baseUrl}/pool/${code}/captain?secret=${secret}`}
    label="My link"
  />
  <CopyLinkButton
    url={`${baseUrl}/pool/${code}`}
    label="Share pool"
    variant="outline"
  />
</div>
```

---

### 5. Leaderboard Button with Arrow

**File:** `app/pool/[code]/captain/page.tsx`

```tsx
// Before:
<Button asChild>
  <Link href={`/pool/${code}/leaderboard`}>View Leaderboard</Link>
</Button>

// After:
<Button asChild className="gap-2">
  <Link href={`/pool/${code}/leaderboard`}>
    View Leaderboard
    <ArrowRight className="h-4 w-4" />
  </Link>
</Button>
```

---

### 6. Remove Bottom Warning

**File:** `app/pool/[code]/captain/page.tsx` (lines ~190-196)

Delete this entire block:
```tsx
<Alert className="mt-6 border-amber-200 bg-amber-50">
  <AlertTriangle className="h-4 w-4 text-amber-600" />
  <AlertDescription className="text-amber-800">
    <strong>Important:</strong> Save this URL! You need it to manage your pool.
  </AlertDescription>
</Alert>
```

The "My link" copy button makes this redundant.

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/pool/[code]/captain/page.tsx` | Fix tooltip, use PoolStatusAction in header, 2 share buttons, arrow on leaderboard, remove warning |
| `app/pool/[code]/captain/components/admin-tab.tsx` | Remove duplicate +, remove status row, add "Manage Props" heading |
| `app/components/pool-status-action.tsx` | NEW - client component for status badge + action button |

---

## Testing

1. **Tooltip:** Hover over help icon, verify tooltip appears
2. **Add Prop button:** Verify single + icon, no duplicate text
3. **Status in header:** Verify badge + button visible at top right of header Card
4. **Status actions:** Click Lock Pool → status changes to Locked, button changes to Complete Pool
5. **AdminTab:** Verify "Manage Props" heading shows, no duplicate status row
6. **Share buttons:** Click "My link" → copies captain URL with secret; Click "Share pool" → copies `/pool/{code}`
7. **Leaderboard:** Verify arrow icon visible
8. **Warning:** Verify removed from page

---

*Status: Ready for implementation*
