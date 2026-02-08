# Feature: Player Page Improvements

> Make the player experience match captain quality

**Approach:** Spec-Driven + TDD - Write failing tests first, then implement.

---

## Features (Implementation Order)

1. **Remove "Pick saved!" toast** - Too noisy (simplest, start here)
2. **Match header layout** - Consistent with captain page
3. **Add help tooltip** - Instructions for players
4. **Remove onboarding screen** - Redirect directly to picks
5. **Fix prop buttons** - Don't look like text inputs

---

## 1. Remove "Pick saved!" Toast

### Spec
- Remove the toast that appears on every pick save
- Keep any completion toast if it exists

### Test First
**File:** `app/hooks/use-picks.test.ts` (create if doesn't exist)

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePicks } from './use-picks';

const mockShowToast = vi.fn();
vi.mock('@/app/hooks/use-toast', () => ({
  useToast: () => ({ showToast: mockShowToast }),
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('usePicks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({ ok: true, json: () => Promise.resolve({}) });
  });

  describe('pick saving', () => {
    it('does NOT show "Pick saved!" toast when pick is saved', async () => {
      const { result } = renderHook(() =>
        usePicks({
          code: 'ABC123',
          secret: 'secret',
          initialPicks: [],
          poolStatus: 'open',
          totalProps: 2,
        })
      );

      await act(async () => {
        await result.current.handlePick('prop-1', 0);
      });

      // Should NOT have been called with 'Pick saved!'
      expect(mockShowToast).not.toHaveBeenCalledWith('Pick saved!', 'success');
    });
  });
});
```

### Implementation
**File:** `app/hooks/use-picks.ts` (line ~87)

```typescript
// DELETE this line:
showToast('Pick saved!', 'success');
```

### Verification
- [ ] Test passes: `npm test -- use-picks`
- [ ] Browser: Make a pick, NO toast appears

---

## 2. Match Header Layout

### Spec
Player header should mirror captain header structure:

```
┌─────────────────────────────────────────────────────────┐
│ [Pool Name]                           [Status Badge]    │
│ Playing as: [Name]                                      │
│                                                         │
│ [My link] [Share pool]              [View Leaderboard →]│
└─────────────────────────────────────────────────────────┘
```

### Test First
**File:** `app/pool/[code]/picks/picks.test.tsx` (create)

```typescript
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

// Note: Server component testing requires special setup
// These tests describe expected behavior for implementation

describe('PlayerPicksPage header', () => {
  it('shows pool name as heading', () => {
    // Assert: h1 or CardTitle with pool name
  });

  it('shows status badge on right side of header', () => {
    // Assert: Badge component with "Open", "Locked", or "Completed"
  });

  it('shows "Playing as: [name]" when authenticated', () => {
    // Assert: text contains "Playing as:" and player name
  });

  it('shows "My link" copy button', () => {
    // Assert: CopyLinkButton with label="My link"
  });

  it('shows "Share pool" copy button with outline variant', () => {
    // Assert: CopyLinkButton with label="Share pool" variant="outline"
  });

  it('shows "View Leaderboard" button with arrow icon', () => {
    // Assert: Button text + ArrowRight icon inside
  });

  it('removes pool code display (redundant with Share pool button)', () => {
    // Assert: no "Pool code:" text
  });
});
```

### Implementation
**File:** `app/pool/[code]/picks/page.tsx`

Replace current header with:

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/app/components/ui/tooltip';
import { HelpCircle } from 'lucide-react';

// In return JSX:
<Card className="shadow-lg mb-6">
  <CardHeader>
    <div className="flex justify-between items-start">
      <CardTitle className="text-2xl">{pool.name}</CardTitle>
      <Badge variant={statusVariant}>
        {pool.status.charAt(0).toUpperCase() + pool.status.slice(1)}
      </Badge>
    </div>
    {participant && (
      <p className="text-sm text-muted-foreground mt-1">
        Playing as: <strong className="text-foreground">{participant.name}</strong>
      </p>
    )}
  </CardHeader>
  <CardContent>
    <div className="flex flex-wrap gap-3">
      <CopyLinkButton url={poolLink} label="My link" />
      <CopyLinkButton url={`${protocol}://${host}/pool/${code}`} label="Share pool" variant="outline" />
      {/* Tooltip added in next section */}
      <Button variant="secondary" asChild className="gap-2 ml-auto">
        <Link href={`/pool/${code}/leaderboard`}>
          View Leaderboard
          <ArrowRight className="h-4 w-4" />
        </Link>
      </Button>
    </div>
  </CardContent>
</Card>
```

### Verification
- [ ] Visual comparison with captain page matches
- [ ] Both copy buttons work correctly

---

## 3. Add Help Tooltip

### Spec
- HelpCircle icon in the button row
- Tooltip shows player instructions on hover/focus

### Test First
**File:** `app/pool/[code]/picks/picks.test.tsx` (add to existing)

```typescript
describe('help tooltip', () => {
  it('renders HelpCircle icon button', () => {
    // Assert: button containing HelpCircle icon exists
  });

  it('tooltip contains "How to Play" heading', async () => {
    // Act: hover/focus on help button
    // Assert: text "How to Play" visible in tooltip
  });

  it('tooltip contains 4 instruction items', async () => {
    // Assert: 4 list items with instructions
  });
});
```

### Implementation
**File:** `app/pool/[code]/picks/page.tsx`

Add to the button row (after Share pool, before View Leaderboard):

```tsx
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <button className="text-muted-foreground hover:text-foreground p-2 transition-colors">
        <HelpCircle className="h-4 w-4" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="max-w-xs p-3">
      <p className="font-medium mb-2">How to Play</p>
      <ol className="list-decimal list-inside space-y-1 text-sm">
        <li>Pick your answers for each prop</li>
        <li>Your picks auto-save when selected</li>
        <li>You can change picks until the pool locks</li>
        <li>Check the leaderboard to see standings</li>
      </ol>
    </TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Verification
- [ ] Hover over help icon, tooltip appears
- [ ] Instructions are readable and helpful

---

## 4. Remove Onboarding Screen

### Spec
- Join flow redirects directly to `/picks?welcome=true`
- Welcome banner shows on picks page for new joins
- Banner includes copy link functionality

### Test First
**File:** `app/api/pools/[code]/join/route.test.ts` (add to existing)

```typescript
describe('POST /api/pools/[code]/join', () => {
  it('redirects to /pool/[code]/picks?welcome=true after successful join', async () => {
    const response = await joinHandler(validRequest, testDb);

    expect(response.status).toBe(302);
    const location = response.headers.get('Location');
    expect(location).toContain('/pool/ABC123/picks');
    expect(location).toContain('welcome=true');
  });
});
```

**File:** `app/pool/[code]/picks/picks.test.tsx` (add)

```typescript
describe('welcome banner', () => {
  it('shows welcome banner when ?welcome=true', () => {
    // Render with searchParams.welcome = 'true'
    // Assert: "You're in!" message visible
  });

  it('welcome banner contains copy link', () => {
    // Assert: CopyLinkButton in banner
  });

  it('does NOT show banner without welcome param', () => {
    // Assert: no "You're in!" message
  });
});
```

### Implementation

**File:** `app/api/pools/[code]/join/route.ts`

Find the redirect and change:
```typescript
// Before:
return NextResponse.redirect(new URL(`/pool/${code}/joined`, request.url));

// After:
return NextResponse.redirect(new URL(`/pool/${code}/picks?welcome=true`, request.url));
```

**File:** `app/pool/[code]/picks/page.tsx`

Add searchParams and welcome banner:
```tsx
export default async function PlayerPicks({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ welcome?: string }>;
}) {
  const { code } = await params;
  const { welcome } = await searchParams;
  const isNewJoin = welcome === 'true';

  // ... existing code ...

  // Add before the props list, after status alerts:
  {isNewJoin && participant && (
    <Alert className="mb-6 border-emerald-200 bg-emerald-50">
      <CheckCircle className="h-4 w-4 text-emerald-600" />
      <AlertDescription className="text-emerald-800 flex items-center gap-2 flex-wrap">
        You're in! Save your link to return later:
        <CopyLinkButton url={poolLink} label="Copy my link" variant="compact" />
      </AlertDescription>
    </Alert>
  )}
```

**File:** `app/pool/[code]/joined/page.tsx`

Convert to redirect fallback:
```tsx
import { redirect } from 'next/navigation';

export default async function JoinedPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  redirect(`/pool/${code}/picks`);
}
```

### Verification
- [ ] Join redirect test passes
- [ ] Join a pool, land on /picks with welcome banner
- [ ] Old /joined URLs redirect to /picks

---

## 5. Fix Prop Selection Buttons

### Spec
- Buttons should NOT look like text input fields
- Add subtle background to unselected state
- Clear visual distinction for selected/hover states

### Test First
**File:** `app/components/picks-view.test.tsx` (add if exists, or create)

```typescript
describe('PicksView option buttons', () => {
  it('unselected buttons have background color (not transparent)', () => {
    render(<PicksView {...defaultProps} />);
    const buttons = screen.getAllByRole('button');
    // Check for bg-muted class or similar
    buttons.forEach(btn => {
      expect(btn.className).toMatch(/bg-/);
    });
  });

  it('selected button has primary accent styling', () => {
    const propsWithPick = { ...defaultProps, myPicks: new Map([['prop-1', 0]]) };
    render(<PicksView {...propsWithPick} />);
    // Assert selected button has distinct styling
  });
});
```

### Implementation
**File:** `app/components/picks-view.tsx`

Find the option button styling and update:

```tsx
// Before (looks like text input):
<button
  className={cn(
    "w-full px-4 py-3 rounded-lg border-2 transition-colors text-left",
    // ... conditions
  )}
>

// After (has background, looks like button):
<button
  className={cn(
    "w-full px-4 py-3 rounded-lg border-2 transition-colors text-left",
    // Unselected: subtle background
    "bg-muted/50 border-transparent",
    // Hover: slightly more visible
    "hover:bg-muted hover:border-muted-foreground/20",
    // Selected: primary accent
    isSelected && !isResolved && "bg-primary/10 border-primary",
    // Correct answer
    isCorrect && "bg-emerald-50 border-emerald-500",
    // Wrong answer
    isWrong && "bg-red-50 border-destructive",
    // Disabled state
    !isOpen && "cursor-default"
  )}
>
```

### Verification
- [ ] Button tests pass
- [ ] Buttons visually look like buttons (not inputs)
- [ ] Selected state is clearly visible
- [ ] Hover provides visual feedback

---

## Implementation Order (TDD)

| # | Feature | Test File | Complexity |
|---|---------|-----------|------------|
| 1 | Remove toast | `use-picks.test.ts` | Low |
| 2 | Header layout | `picks.test.tsx` | Medium |
| 3 | Help tooltip | `picks.test.tsx` | Low |
| 4 | Remove onboarding | `join/route.test.ts`, `picks.test.tsx` | Medium |
| 5 | Button styling | `picks-view.test.tsx` | Low |

---

## Files to Modify

| File | Changes |
|------|---------|
| `app/hooks/use-picks.ts` | Remove "Pick saved!" toast |
| `app/pool/[code]/picks/page.tsx` | Header layout, tooltip, welcome banner |
| `app/api/pools/[code]/join/route.ts` | Redirect to /picks?welcome=true |
| `app/pool/[code]/joined/page.tsx` | Convert to redirect fallback |
| `app/components/picks-view.tsx` | Button background styling |

## Test Files

| File | New Tests |
|------|-----------|
| `app/hooks/use-picks.test.ts` | Toast not called on save |
| `app/pool/[code]/picks/picks.test.tsx` | Header, tooltip, welcome banner |
| `app/api/pools/[code]/join/route.test.ts` | Redirect destination includes ?welcome=true |
| `app/components/picks-view.test.tsx` | Button styling classes |

---

*Status: Ready for TDD implementation*
