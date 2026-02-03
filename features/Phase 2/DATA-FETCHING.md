# Feature: Data Fetching with React Query

> Replace manual fetch calls with React Query for caching, polling, and better UX

---

## Current State (Phase 1)

**How it works now:**
- Server Components fetch data on render
- No client-side caching
- Manual page refresh for updates
- No loading states (full page reload)

**Problems:**
- Stale data until refresh
- No optimistic updates
- Poor UX for mutations (full reload)
- Can't poll for live updates

---

## Target State (Phase 2)

**Goal:** Real-time feel with automatic polling, proper loading states, and optimistic updates

---

## Why React Query?

1. **Caching** - Don't refetch data we already have
2. **Polling** - `refetchInterval` for live updates
3. **Mutations** - `useMutation` with optimistic updates
4. **Loading/Error states** - Built-in `isLoading`, `isError`
5. **Devtools** - See cache state during development

---

## Implementation Plan

### 1. Setup

```bash
npm install @tanstack/react-query
```

```typescript
// src/providers/query-provider.tsx
'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60, // 1 minute
        refetchOnWindowFocus: true,
      },
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

```typescript
// app/layout.tsx
import { QueryProvider } from '@/src/providers/query-provider';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
```

### 2. Query Hooks

```typescript
// src/hooks/use-pool.ts
import { useQuery } from '@tanstack/react-query';

export function usePool(code: string) {
  return useQuery({
    queryKey: ['pool', code],
    queryFn: () => fetch(`/api/pools/${code}`).then(r => r.json()),
    staleTime: 1000 * 30, // 30 seconds
  });
}

export function useLeaderboard(code: string) {
  return useQuery({
    queryKey: ['leaderboard', code],
    queryFn: () => fetch(`/api/pools/${code}/leaderboard`).then(r => r.json()),
    refetchInterval: 1000 * 10, // Poll every 10 seconds
  });
}

export function useProps(code: string) {
  return useQuery({
    queryKey: ['props', code],
    queryFn: () => fetch(`/api/pools/${code}/props`).then(r => r.json()),
    staleTime: 1000 * 60, // 1 minute (props don't change often)
  });
}
```

### 3. Mutation Hooks

```typescript
// src/hooks/use-submit-pick.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';

export function useSubmitPick(code: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: { propId: string; selectedOptionIndex: number }) =>
      fetch(`/api/pools/${code}/picks`, {
        method: 'POST',
        body: JSON.stringify(data),
      }).then(r => r.json()),

    // Optimistic update
    onMutate: async (newPick) => {
      await queryClient.cancelQueries({ queryKey: ['picks', code] });
      const previous = queryClient.getQueryData(['picks', code]);

      queryClient.setQueryData(['picks', code], (old: any) => ({
        ...old,
        picks: old.picks.map((p: any) =>
          p.propId === newPick.propId
            ? { ...p, selectedOptionIndex: newPick.selectedOptionIndex }
            : p
        ),
      }));

      return { previous };
    },

    onError: (err, variables, context) => {
      // Rollback on error
      queryClient.setQueryData(['picks', code], context?.previous);
    },

    onSettled: () => {
      // Refetch to ensure consistency
      queryClient.invalidateQueries({ queryKey: ['picks', code] });
    },
  });
}
```

### 4. Page Components

**Before (Server Component):**
```typescript
// app/pool/[code]/leaderboard/page.tsx
export default async function LeaderboardPage({ params }) {
  const { code } = await params;
  const data = await fetch(`/api/pools/${code}/leaderboard`);
  return <Leaderboard data={data} />;
}
```

**After (Client Component with React Query):**
```typescript
// app/pool/[code]/leaderboard/page.tsx
'use client';

import { useLeaderboard } from '@/src/hooks/use-leaderboard';
import { LeaderboardSkeleton } from '@/src/components/skeletons';

export default function LeaderboardPage({ params }) {
  const { code } = params;
  const { data, isLoading, isError } = useLeaderboard(code);

  if (isLoading) return <LeaderboardSkeleton />;
  if (isError) return <ErrorMessage />;

  return <Leaderboard data={data} />;
}
```

---

## Polling Strategy

| Page | Interval | Rationale |
|------|----------|-----------|
| Leaderboard | 10s | Need live scores |
| Captain dashboard | 30s | See new participants |
| Picks page | 30s | See if pool locked |
| Pool info | 60s | Rarely changes |

```typescript
// Conditional polling - stop when pool is completed
const { data } = useLeaderboard(code, {
  refetchInterval: (data) =>
    data?.pool?.status === 'completed' ? false : 10000,
});
```

---

## Server Components vs Client Components

### Keep as Server Components
- Initial page shell/layout
- Static content (headers, footers)
- SEO-critical pages (none for this app)

### Convert to Client Components
- Leaderboard (needs polling)
- Picks page (needs mutations)
- Captain dashboard (needs both)

### Hybrid Approach
```typescript
// Server component fetches initial data
export default async function Page({ params }) {
  const initialData = await getLeaderboard(params.code);
  return <LeaderboardClient initialData={initialData} code={params.code} />;
}

// Client component hydrates with initial data, then takes over
function LeaderboardClient({ initialData, code }) {
  const { data } = useLeaderboard(code, { initialData });
  return <Leaderboard data={data} />;
}
```

---

## Loading States

### Skeleton Components

```typescript
// src/components/skeletons.tsx
export function LeaderboardSkeleton() {
  return (
    <div className="animate-pulse space-y-3">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-12 bg-gray-700 rounded" />
      ))}
    </div>
  );
}

export function PropCardSkeleton() {
  return (
    <div className="animate-pulse">
      <div className="h-6 bg-gray-700 rounded w-3/4 mb-4" />
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-700 rounded" />
        ))}
      </div>
    </div>
  );
}
```

### Loading States Strategy

1. **Initial load**: Show skeleton
2. **Background refetch**: Keep showing old data (no flicker)
3. **Mutation pending**: Show optimistic state + subtle indicator
4. **Error**: Show error message with retry button

---

## Error Handling

```typescript
// src/hooks/use-pool.ts
export function usePool(code: string) {
  return useQuery({
    queryKey: ['pool', code],
    queryFn: async () => {
      const res = await fetch(`/api/pools/${code}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || 'Failed to load pool');
      }
      return res.json();
    },
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });
}
```

---

## Decisions (Confirmed)

1. **Initial data:** Hybrid approach
   - Server component fetches initial data
   - Passes to client component for hydration
   - React Query takes over for polling/mutations
   - Better first paint, no loading spinner on initial view

2. **Hook location:** `src/hooks/` folder
   - Centralized, reusable across pages
   - Easier to maintain and test

3. **Devtools:** Dev only
   - Exclude ReactQueryDevtools from prod build
   - Use `process.env.NODE_ENV` check

4. **Offline support:** Not for Phase 2
   - Add in Phase 4 if needed
   - Focus on online experience first

---

## Dependencies

- Auth migration must complete first (need cookies for authenticated fetches)
- Can start skeleton components in parallel

---

## Files to Create

### New Files
- `src/providers/query-provider.tsx`
- `src/hooks/use-pool.ts`
- `src/hooks/use-leaderboard.ts`
- `src/hooks/use-props.ts`
- `src/hooks/use-picks.ts`
- `src/hooks/use-submit-pick.ts`
- `src/components/skeletons.tsx`

### Modified Files
- `app/layout.tsx` - Add QueryProvider
- `app/pool/[code]/leaderboard/page.tsx` - Convert to client
- `app/pool/[code]/picks/page.tsx` - Convert to client
- `app/pool/[code]/captain/page.tsx` - Convert to client

---

## Testing Plan

1. **Unit tests**: Query hooks with mock responses
2. **Integration tests**: Polling behavior, cache invalidation
3. **E2E tests**: Full flow with real API

---

*Status: Ready for implementation*
