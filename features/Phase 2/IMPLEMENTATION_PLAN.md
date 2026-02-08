# Props-With-Pals: High Priority Implementation Plan

## Overview
This plan covers the remaining high-priority items from the codebase review. Each section includes what we'll build, files affected, and estimated effort.

---

## 1. Rate Limiting with Upstash Redis

### Why Upstash?
The in-memory rate limiter I created won't work on Vercel because each serverless function instance has isolated memory. Upstash provides a Redis-compatible store that works across all instances.

### Setup Required (You)
1. Create account at https://upstash.com (free tier: 10K commands/day)
2. Create a new Redis database (choose region closest to your Vercel deployment)
3. Copy credentials to `.env.local`:
   ```
   UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
   UPSTASH_REDIS_REST_TOKEN=xxx
   ```

### Implementation (Me)
```
Files to create/modify:
├── src/lib/rate-limit.ts        # Replace in-memory with Upstash
├── middleware.ts                 # Add rate limiting middleware
└── package.json                  # Add @upstash/ratelimit, @upstash/redis
```

**Rate Limits I'll Configure:**
| Endpoint Pattern | Limit | Window | Reason |
|------------------|-------|--------|--------|
| `POST /api/pools` | 5/min | 60s | Prevent pool spam |
| `POST /api/pools/*/join` | 20/min | 60s | Allow quick joins |
| `POST /api/pools/*/picks` | 60/min | 60s | Allow rapid picking |
| `All other API routes` | 100/min | 60s | General protection |

**Estimated effort**: 1-2 hours

---

## 2. Sentry Error Tracking

### What It Does
- Automatically captures all unhandled errors (client + server)
- Provides stack traces, browser info, and user context
- Alerts you when new errors occur in production

### Setup Required (You)
1. Create account at https://sentry.io (free tier: 5K errors/month)
2. Create a new Next.js project
3. Copy the DSN (looks like `https://xxx@xxx.ingest.sentry.io/xxx`)

### Implementation (Me)
```
Files created by Sentry wizard:
├── sentry.client.config.ts      # Client-side config
├── sentry.server.config.ts      # Server-side config
├── sentry.edge.config.ts        # Edge runtime config
├── next.config.ts               # Modified to include Sentry
└── .env.local                   # Add SENTRY_DSN
```

**What gets instrumented automatically:**
- All unhandled exceptions
- All API route errors
- React error boundaries (connects to our error.tsx files)
- Performance monitoring (optional)

**Estimated effort**: 30 minutes

---

## 3. AdminTab Component Refactor

### Current State
`admin-tab.tsx` is 387 lines handling:
- Props list display
- Add prop form
- Edit prop modal
- Resolve prop buttons

### Proposed Structure
```
app/pool/[code]/captain/components/
├── admin-tab.tsx                # Slim orchestrator (~50 lines)
├── props-list.tsx               # List of props with resolve buttons (~120 lines)
├── add-prop-form.tsx            # Collapsible form for new props (~100 lines)
└── edit-prop-modal.tsx          # Inline edit mode for existing props (~100 lines)
```

### Component Responsibilities

**AdminTab (orchestrator)**
- Receives hooks from parent
- Renders section heading
- Composes child components
- No direct state management

**PropsList**
- Displays all props in cards
- Shows resolve buttons when pool is locked
- Triggers edit mode on pencil click
- Handles prop resolution

**AddPropForm**
- Collapsible form (open/closed state)
- Question, options, point value inputs
- Submit handler
- Validation feedback

**EditPropModal**
- Inline edit mode (replaces card content)
- Warning when picks exist
- Save/cancel buttons
- Same fields as AddPropForm

### State Management
No changes to hook structure - components receive hook returns as props (same pattern as now, just split across files).

**Estimated effort**: 2-3 hours

---

## 4. Centralized API Client

### Current State
17 fetch calls scattered across:
- `use-picks.ts`
- `use-admin-actions.ts`
- `use-add-prop-form.ts`
- `use-edit-prop.ts`
- `use-players.ts`
- `captain-client.tsx`

### Proposed Structure
```
app/lib/
└── api-client.ts                # All API calls in one place
```

### API Client Design
```typescript
// app/lib/api-client.ts

// Pools
export async function createPool(data: CreatePoolInput): Promise<CreatePoolResponse>
export async function getPool(code: string): Promise<Pool>
export async function updatePoolStatus(code: string, status: PoolStatus): Promise<void>

// Players
export async function joinPool(code: string, name: string): Promise<JoinResponse>
export async function getPlayers(code: string): Promise<Player[]>

// Props
export async function addProp(code: string, data: PropInput): Promise<Prop>
export async function updateProp(code: string, propId: string, data: PropInput): Promise<Prop>
export async function resolveProp(code: string, propId: string, optionIndex: number): Promise<void>

// Picks
export async function submitPick(code: string, propId: string, optionIndex: number): Promise<void>
export async function getPicks(code: string): Promise<Pick[]>
```

### Benefits
1. **Consistent error handling** - One place to handle 401s, 500s, network errors
2. **Type safety** - Typed inputs and outputs for all API calls
3. **Easy to test** - Mock one file instead of scattered fetches
4. **Future-proof** - Easy to add request interceptors, logging, retries

### Migration Strategy
1. Create `api-client.ts` with all functions
2. Update hooks one-by-one to use new client
3. Remove inline fetch calls

**Estimated effort**: 3-4 hours

---

## Implementation Order

I recommend this sequence:

1. **Sentry** (30 min) - Quick win, immediately useful
2. **API Client** (3-4 hrs) - Foundation for cleaner code
3. **AdminTab Refactor** (2-3 hrs) - Uses new API client
4. **Rate Limiting** (1-2 hrs) - After you have Upstash credentials

**Total estimated effort**: 7-10 hours

---

## Questions for You

1. **Rate limits** - Are the limits I proposed reasonable? Too strict/lenient?
2. **Sentry** - Do you want performance monitoring too, or just error tracking?
3. **AdminTab** - Should EditPropModal be a true modal (overlay) or inline edit (current)?
4. **API Client** - Any endpoints I missed? Any special error handling needs?

---

## Ready to Proceed?

Once you've reviewed this plan:
1. Let me know if you want any changes
2. Set up Upstash + Sentry accounts when ready
3. I'll implement in the order above

Delete this file after we're done - it's just for planning.
