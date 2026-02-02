# Technical Considerations: Props-With-Pals

Performance goals, architecture decisions, and technical patterns.

---

## Performance Goals

### Page Load
| Metric | Target | Rationale |
|--------|--------|-----------|
| First Contentful Paint (FCP) | < 1.5s | Users on mobile during game |
| Largest Contentful Paint (LCP) | < 2.5s | Main content visible quickly |
| Time to Interactive (TTI) | < 3s | Can start picking immediately |
| Total bundle size | < 200KB gzipped | Fast on cellular networks |

### Runtime
| Metric | Target | Rationale |
|--------|--------|-----------|
| Pick selection feedback | < 100ms | Feels instant |
| API response time | < 500ms | Responsive interactions |
| Leaderboard refresh | < 1s | Quick updates during game |

### Offline Behavior (MVP)
- Show "You're offline" banner when connection lost
- UI remains visible but actions disabled
- Auto-retry when connection restored

### Offline Support (Phase 4)
- Cache last known pool state in localStorage
- Queue picks if offline, sync when back
- Conflict resolution for stale picks

---

## Real-Time Updates

### MVP: Polling
Simple polling every 10 seconds when pool is active:
- Fetch latest data on interval
- Compare with current state
- Highlight changes visually
- Show "Last updated X seconds ago"

**Pros**: Simple, works everywhere, no extra infrastructure
**Cons**: Not truly real-time, some wasted requests

### Phase 4: Server-Sent Events (SSE)
Better pattern for one-way server → client updates:

```
Server pushes events:
  - participant_joined
  - prop_resolved
  - leaderboard_updated
  - pool_locked

Client receives and updates UI instantly
```

**Why SSE over WebSockets?**
| SSE | WebSockets |
|-----|------------|
| One-way (server → client) | Bidirectional |
| Works over HTTP/2 | Separate protocol |
| Auto-reconnect built in | Manual reconnect logic |
| Simpler server implementation | More complex |
| Perfect for our use case | Overkill |

**Implementation**: Next.js API route with `ReadableStream`

---

## Database Strategy

### Stack: Vercel + Turso
- **Hosting**: Vercel (free tier, auto-deploys from GitHub)
- **Database**: Turso (SQLite-compatible, serverless-native, free tier)
- **ORM**: Drizzle (TypeScript-first, works with Turso)

### Why Turso Instead of SQLite File?
Vercel's serverless functions are ephemeral - each request might run on a different server with no shared filesystem. A SQLite file would be lost or inconsistent between requests. Turso solves this by hosting the database externally while keeping SQLite's simplicity.

### ORM Choice
**Drizzle ORM**:
- TypeScript-first, great type safety
- Lightweight (no heavy runtime)
- Works with SQLite, Turso, and Postgres
- Easy migrations
- Same code works regardless of deployment choice

---

## API Conventions

### Route Structure
RESTful plural routes:

```
POST   /api/pools              - create pool
GET    /api/pools/[code]       - get pool
PATCH  /api/pools/[code]       - update pool status (lock)

GET    /api/pools/[code]/props - get all props
POST   /api/pools/[code]/props - create prop
PATCH  /api/pools/[code]/props/[id] - update prop (before lock)
DELETE /api/pools/[code]/props/[id] - delete prop (before lock)
POST   /api/pools/[code]/props/[id]/resolve - mark correct answer (captain only, when locked)

POST   /api/pools/[code]/join  - join as participant
GET    /api/pools/[code]/participants - get all participants
GET    /api/pools/[code]/leaderboard - get ranked participants

GET    /api/pools/[code]/picks - get my picks (auth required)
POST   /api/pools/[code]/picks - submit picks (overwrites existing, auth required)
```

### Resolve Endpoint Details
`POST /api/pools/[code]/props/[id]/resolve` triggers side effects:
1. Set `prop.correct_option_index`
2. Calculate `points_earned` for all picks on this prop
3. Update `total_points` for affected participants
4. If all props resolved → set `pool.status = 'completed'`

### Response Format
Direct responses with HTTP status codes:

```typescript
// Success (200/201)
{ id: "abc", name: "Super Bowl 2026", ... }

// Error (4xx/5xx)
{ code: "POOL_NOT_FOUND", message: "Pool not found" }
```

### Error Codes
| HTTP Status | Code | When |
|-------------|------|------|
| 400 | `VALIDATION_ERROR` | Invalid input |
| 401 | `UNAUTHORIZED` | Missing or invalid secret |
| 403 | `POOL_LOCKED` | Picks submitted after lock |
| 404 | `POOL_NOT_FOUND` | Invalid invite code |
| 404 | `PROP_NOT_FOUND` | Invalid prop ID |
| 409 | `NAME_TAKEN` | Duplicate participant name |
| 429 | `RATE_LIMITED` | Too many requests |

### Validation
**Zod** for request validation:

```typescript
const CreatePoolSchema = z.object({
  name: z.string().min(1).max(100),
  captainName: z.string().min(1).max(50),
  buyInAmount: z.string().optional(),
});

const SubmitPicksSchema = z.object({
  picks: z.array(z.object({
    propId: z.string().uuid(),
    selectedOptionIndex: z.number().int().min(0),
  })),
});
```

---

## State Management

### Phase 1: Server Components + Fetch
Leverage Next.js App Router for simple data fetching:

```typescript
// Server Component - data fetching is straightforward
async function PoolPage({ params }: { params: { code: string } }) {
  const pool = await getPool(params.code);
  return <PoolView pool={pool} />;
}

// Client Component - mutations with plain fetch
'use client';
function SubmitPickButton({ poolCode, propId }: Props) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(optionIndex: number) {
    setLoading(true);
    await fetch(`/api/pools/${poolCode}/picks`, {
      method: 'POST',
      body: JSON.stringify({ propId, selectedOptionIndex: optionIndex }),
    });
    router.refresh(); // Revalidate server component data
    setLoading(false);
  }
}
```

### Phase 2: Add React Query for Polling
When real-time updates are needed:

```typescript
// Automatic polling
const { data: pool } = useQuery({
  queryKey: ['pool', code],
  queryFn: () => fetchPool(code),
  refetchInterval: 10000, // 10s polling
});

// Optimistic updates for picks
const mutation = useMutation({
  mutationFn: submitPick,
  onMutate: async (newPick) => {
    // Optimistically update UI
  },
  onError: (err, newPick, context) => {
    // Rollback on error
  },
});
```

### What Goes Where
| Data | Location | Phase | Why |
|------|----------|-------|-----|
| User secrets | URL params | 1 | No localStorage in Phase 1 |
| User secrets | localStorage | 2+ | Persist across sessions |
| Pool data | Server Components | 1 | Simple, no client JS |
| Pool data | React Query cache | 2+ | Auto-refresh, polling |
| Form state | Local component state | All | Temporary, not shared |
| UI state (modals, tabs) | Local component state | All | UI-specific |

---

## Secret Storage

### Current Approach: URL Params + localStorage
```
URL: /pool/ABC123/picks?secret=xyz789
localStorage: { "pwp_ABC123": { secret: "xyz789", name: "Mike" } }
```

**Pros**: Simple, shareable links work
**Cons**: Secrets visible in browser history, server logs

### Alternative: httpOnly Cookies
```
POST /api/pool/[code]/join → Sets cookie
Subsequent requests authenticated via cookie
```

**Pros**: More secure, not in URL/history
**Cons**: More complex, sharing links requires different flow

### Recommendation for MVP
Stick with **URL params + localStorage**:
- Simpler implementation
- Shareable links are a key feature
- Acceptable security for friend group app
- Can migrate to cookies in Phase 3 if needed

### Mitigations
- Use HTTPS only (secrets encrypted in transit)
- Short-lived URLs where possible
- Clear guidance that links contain access credentials

---

## Security Considerations

### Authentication & Authorization
| Check | Where | Implementation |
|-------|-------|----------------|
| Captain access | API routes | Verify `captain_secret` matches pool |
| Participant access | API routes | Verify `secret` matches participant |
| Pool exists | API routes | Return 404, not "invalid secret" (prevent enumeration) |
| Pick timing | API routes | Server-side check `pool.status !== 'locked'` |

### Input Validation
- **Zod schemas** for all API inputs
- Sanitize user content (names, questions) on display
- Validate invite codes: exactly 6 chars, A-Z + 2-9 only
- Validate option indices are in range

### Rate Limiting
Prevent brute-force attacks on invite codes and pool enumeration:

| Endpoint | Limit | Rationale |
|----------|-------|-----------|
| `GET /api/pools/[code]` | 10/min per IP | Prevent pool enumeration |
| `POST /api/pools/[code]/join` | 5/min per IP | Prevent join spam |
| `POST /api/pools` | 3/min per IP | Prevent pool creation spam |
| All other endpoints | 60/min per IP | General protection |

**Implementation**:
- **MVP**: Vercel Edge Config or simple in-memory tracking
- **Phase 3**: Upstash Redis for distributed rate limiting

### Logging Security
**Never log secrets.** These values must be excluded from all logs:
- `captain_secret`
- `participant.secret`
- Full URLs containing `?secret=` params

When logging requests, redact sensitive params:
```typescript
// Bad: logs full URL with secret
console.log(`Request: ${req.url}`);

// Good: redact secret param
const safeUrl = req.url.replace(/secret=[^&]+/, 'secret=REDACTED');
console.log(`Request: ${safeUrl}`);
```

### XSS Prevention
User-generated content (pool names, participant names, prop questions):
- React escapes by default in JSX
- Never use `dangerouslySetInnerHTML` with user content
- Sanitize if storing HTML (we don't plan to)

### SQL Injection
- Drizzle uses parameterized queries - protected by default
- Never interpolate user input into raw SQL

### Secret Entropy
- `crypto.randomUUID()` provides 122 bits of entropy
- 32 character hex string = 128 bits
- Sufficient for our use case (not protecting bank accounts)

### Threat Model
| Threat | Risk | Mitigation |
|--------|------|------------|
| Guess invite code | Low (32^6 = 1B combinations) | Rate limiting (10/min) |
| Pool enumeration | Low | Aggressive rate limiting on GET pool |
| Intercept captain secret | Medium | HTTPS, never log secrets |
| Submit picks after lock | Medium | Server-side status check |
| Impersonate participant | Low | Secret in URL, localStorage |
| XSS via pool name | Low | React escapes by default |
| Secret in server logs | Medium | Explicit redaction policy |

---

## CI/CD Pipeline

Set up from Phase 1 - all PRs must pass before merge.

### GitHub Actions Workflow
```yaml
# .github/workflows/ci.yml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  check:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm run test
      - run: npm run build
```

### Scripts (package.json)
```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Deployment Flow
1. **PR opened** → CI runs lint, typecheck, tests, build
2. **PR merged to main** → Vercel auto-deploys to production
3. **Preview deployments** → Vercel creates preview URL for each PR

### Database Migrations
- Drizzle generates migration files
- Run migrations on deploy via build script
- Keep migrations in version control

---

## Error Handling

### Client Errors
- Network failures: Show banner, disable actions, auto-retry
- Validation errors: Inline messages, don't clear form
- 404 (pool not found): Friendly message, link home

### Server Errors
- Log all errors with context (but not secrets)
- Return user-friendly messages
- Never expose internal details or stack traces

### Graceful Degradation
- If polling fails, show stale data with warning
- If localStorage fails, app still works (just no persistence)
- If API slow, show skeleton, don't block

---

## Testing Strategy

### Approach: TDD (Test-Driven Development)
Write tests before implementation for all features. This ensures:
- Clear requirements before coding
- High test coverage naturally
- Confidence in refactoring
- Documentation through tests

### Unit Tests (Vitest)
Write first, implement second:
- Business logic (point calculations, status transitions)
- Utility functions (invite code generation, validation)
- Zod schema validation

### Integration Tests (Vitest)
Test API routes end-to-end:
- Create pool → verify database state
- Submit picks → verify overwrites existing
- Resolve prop → verify points calculated
- Full flows with test database

### E2E Tests (Phase 3 - Playwright)
- Full user flows (captain creates pool → participants join → picks → results)
- Mobile viewport testing

### Test File Structure
```
src/
  lib/
    points.ts
    points.test.ts      # Unit tests alongside code
  app/
    api/
      pools/
        route.ts
        route.test.ts   # Integration tests for API routes
```

### Running Tests
```bash
npm run test        # Run all tests once
npm run test:watch  # Watch mode during development
npm run test:coverage # Coverage report
```

---

## Caching Strategy

### Client-Side
```
localStorage:
  - User secrets per pool (authentication)
  - User preferences (future: dark mode)

React Query cache:
  - Pool data (auto-refreshed)
  - Props list
  - Leaderboard
```

### Server-Side (Future)
- In-memory cache for leaderboard calculations
- Consider Redis if scaling beyond single instance

---

## Monitoring (Phase 3+)

### Error Tracking
- Sentry for client and server errors
- Alert on error spikes

### Analytics
- Simple page view tracking
- Pool creation/join events
- No PII collected

### Uptime
- Vercel provides basic monitoring
- Consider Checkly for critical flows

---

## Technical Debt Guidelines

### Acceptable for MVP
- Inline styles for one-off components
- Some code duplication in similar components
- Manual type definitions (vs generated)

### Address Before Phase 3
- Extract shared components to component library
- Add proper error boundaries
- Improve loading state coverage

### Never Skip
- TypeScript types (no `any`)
- Input validation
- Error handling for API calls
- Mobile testing

