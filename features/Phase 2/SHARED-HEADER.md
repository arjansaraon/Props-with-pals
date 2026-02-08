# Feature: Shared Header Component (Optional)

> Reduce drift between captain and player page headers

---

## Problem

Captain and player pages have similar headers that are implemented separately:
- Pool name + status badge
- User identity (captain name / "Playing as: X")
- Share buttons (My link + Share pool)
- Help tooltip
- Leaderboard button

As we add features, these headers can drift apart. A shared component ensures consistency.

---

## Proposed Component

**New file:** `app/components/pool-header.tsx`

```tsx
'use client';

import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { CopyLinkButton } from '@/app/components/copy-link-button';
import { HelpCircle, ArrowRight, Lock, Trophy } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import Link from 'next/link';

interface PoolHeaderProps {
  // Pool info
  poolName: string;
  poolCode: string;
  poolStatus: 'open' | 'locked' | 'completed';

  // User info
  userRole: 'captain' | 'player';
  userName: string;

  // URLs
  myLinkUrl: string;
  shareLinkUrl: string;

  // Tooltip content
  tooltipTitle: string;
  tooltipInstructions: string[];

  // Captain-only: status action
  onStatusAction?: () => void;
  statusActionLabel?: string;
  statusActionLoading?: boolean;

  // Optional: additional info line
  detailsLine?: React.ReactNode;
}

export function PoolHeader({
  poolName,
  poolCode,
  poolStatus,
  userRole,
  userName,
  myLinkUrl,
  shareLinkUrl,
  tooltipTitle,
  tooltipInstructions,
  onStatusAction,
  statusActionLabel,
  statusActionLoading,
  detailsLine,
}: PoolHeaderProps) {
  const statusConfig = {
    open: { label: 'Open', variant: 'success' as const },
    locked: { label: 'Locked', variant: 'warning' as const },
    completed: { label: 'Completed', variant: 'info' as const },
  };

  const currentStatus = statusConfig[poolStatus];

  return (
    <div className="mb-6">
      {/* Row 1: Name + Status + Action */}
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">{poolName}</h1>
        <div className="flex items-center gap-3">
          <Badge variant={currentStatus.variant}>{currentStatus.label}</Badge>
          {onStatusAction && statusActionLabel && (
            <Button
              onClick={onStatusAction}
              disabled={statusActionLoading}
              size="sm"
            >
              {poolStatus === 'open' && <Lock className="h-4 w-4 mr-2" />}
              {poolStatus === 'locked' && <Trophy className="h-4 w-4 mr-2" />}
              {statusActionLabel}
            </Button>
          )}
        </div>
      </div>

      {/* Row 2: User identity + optional details */}
      <p className="text-muted-foreground mb-4">
        {userRole === 'captain' ? (
          <>Captain: <strong className="text-foreground">{userName}</strong></>
        ) : (
          <>Playing as: <strong className="text-foreground">{userName}</strong></>
        )}
        {detailsLine && (
          <span className="ml-2">{detailsLine}</span>
        )}
      </p>

      {/* Row 3: Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CopyLinkButton url={myLinkUrl} label="My link" />
          <CopyLinkButton url={shareLinkUrl} label="Share pool" variant="outline" />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button className="text-muted-foreground hover:text-foreground p-2">
                  <HelpCircle className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-xs p-3">
                <p className="font-medium mb-2">{tooltipTitle}</p>
                <ol className="list-decimal list-inside space-y-1 text-sm">
                  {tooltipInstructions.map((instruction, i) => (
                    <li key={i}>{instruction}</li>
                  ))}
                </ol>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Button asChild variant="outline">
          <Link href={`/pool/${poolCode}/leaderboard`}>
            View Leaderboard
            <ArrowRight className="h-4 w-4 ml-2" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
```

---

## Usage

### Captain Page

```tsx
<PoolHeader
  poolName={pool.name}
  poolCode={code}
  poolStatus={pool.status}
  userRole="captain"
  userName={pool.captainName}
  myLinkUrl={`${baseUrl}/pool/${code}/captain?secret=${secret}`}
  shareLinkUrl={`${baseUrl}/pool/${code}`}
  tooltipTitle="Captain Instructions"
  tooltipInstructions={[
    'Share the invite code with friends',
    'Add props while the pool is open',
    'Lock the pool when ready',
    'Mark correct answers after the event',
  ]}
  onStatusAction={handleLockPool}
  statusActionLabel={pool.status === 'open' ? 'Lock Pool' : 'Complete Pool'}
  statusActionLoading={isLocking}
  detailsLine={
    <>
      {pool.buyInAmount && <> • Buy-in: {pool.buyInAmount}</>}
      • Created: {new Date(pool.createdAt).toLocaleDateString()}
    </>
  }
/>
```

### Player Page

```tsx
<PoolHeader
  poolName={pool.name}
  poolCode={code}
  poolStatus={pool.status}
  userRole="player"
  userName={player.name}
  myLinkUrl={`${baseUrl}/pool/${code}/picks`}
  shareLinkUrl={`${baseUrl}/pool/${code}`}
  tooltipTitle="How to Play"
  tooltipInstructions={[
    'Pick your answers for each prop',
    'Your picks auto-save when selected',
    'You can change picks until the pool locks',
    'Check the leaderboard to see standings',
  ]}
/>
```

---

## Benefits

1. **Consistency** - Both pages use same component, same styling
2. **Maintainability** - Changes in one place affect both
3. **Type safety** - Props interface documents all options
4. **Flexibility** - Optional props for captain-specific features

---

## Implementation Notes

- This is marked **optional** because the individual fixes can be done first
- Implement after HEADER-UX and PLAYER-EXPERIENCE are complete
- Refactoring existing code into shared component

---

## Files to Create/Modify

| File | Changes |
|------|---------|
| `app/components/pool-header.tsx` | NEW - shared header component |
| `app/pool/[code]/captain/page.tsx` | Replace header with PoolHeader |
| `app/pool/[code]/picks/page.tsx` | Replace header with PoolHeader |

---

## Testing

1. Compare captain and player pages side-by-side
2. Verify all functionality works:
   - Status badge displays correctly
   - Copy buttons work
   - Tooltip appears
   - Leaderboard link works
   - Captain: Lock/Complete buttons work

---

*Status: Optional refactor - implement after core fixes*
