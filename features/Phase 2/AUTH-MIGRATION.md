# Feature: Auth Migration

> Move from URL query param secrets to secure cookie-based authentication

---

## Current State (Phase 1)

**How it works now:**
- Secrets passed via `?secret=xxx` query parameter
- Captain gets `captainSecret` on pool creation, saves URL
- Participant gets `secret` on join, saves URL

**Problems:**
- Secrets visible in browser history
- Secrets logged in server access logs
- Secrets leaked via Referer header to external links
- Easy to accidentally share URL with secret

---

## Target State (Phase 2)

**Goal:** Secrets stored in HttpOnly cookies, never exposed to JavaScript or URLs

---

## Design Options

### Option A: HttpOnly Cookies (Recommended)

**How it works:**
1. On pool creation/join, server sets `Set-Cookie` with secret
2. Cookie is `HttpOnly`, `Secure`, `SameSite=Lax`
3. Browser automatically sends cookie on subsequent requests
4. Server validates cookie on protected endpoints

**Pros:**
- Most secure (secret never in JS)
- Automatic (browser handles it)
- Works with SSR

**Cons:**
- Need CSRF protection for mutations
- Cookie scope complexity (per-pool vs global)

**Cookie structure:**
```
pwp_auth = base64({ poolCode: secret, poolCode2: secret2, ... })
```

### Option B: Authorization Header + localStorage

**How it works:**
1. On pool creation/join, server returns secret in response body
2. Client stores in localStorage: `{ [poolCode]: secret }`
3. Client sends `Authorization: Bearer <secret>` on requests

**Pros:**
- No CSRF needed
- Simpler mental model
- More explicit

**Cons:**
- Secret accessible to JS (XSS risk)
- Must manually add header to every request
- Doesn't work with SSR initial load

### Option C: Session-based (NextAuth.js)

**How it works:**
1. Use NextAuth.js with credentials provider
2. Create "session" on join, store session ID in cookie
3. Session maps to participant record

**Pros:**
- Battle-tested library
- Built-in CSRF
- Session management handled

**Cons:**
- Overkill for our use case
- Adds complexity
- We don't have user accounts

---

## Recommendation: Option A (HttpOnly Cookies)

Reasons:
1. Most secure for browser-based app
2. Works naturally with Next.js server components
3. Secrets never exposed to client-side JS

---

## Implementation Plan

### Phase 1: Cookie Infrastructure

```typescript
// src/lib/auth.ts

interface AuthCookieData {
  pools: Record<string, string>; // { inviteCode: secret }
}

export function setPoolSecret(code: string, secret: string, res: Response) {
  // Read existing cookie, add new pool, write back
}

export function getPoolSecret(code: string, req: Request): string | null {
  // Read cookie, extract secret for pool
}

export function clearPoolSecret(code: string, res: Response) {
  // Remove pool from cookie
}
```

### Phase 2: Update Endpoints

**Before:**
```typescript
const secret = url.searchParams.get('secret');
```

**After:**
```typescript
import { getPoolSecret } from '@/src/lib/auth';
const secret = getPoolSecret(code, request);
```

### Phase 3: CSRF Protection

For state-changing operations (POST, PATCH, DELETE):

```typescript
// Option 1: Double-submit cookie
// - Server generates CSRF token, stores in cookie
// - Client reads cookie, sends in header
// - Server compares

// Option 2: SameSite=Strict
// - Rely on SameSite cookie attribute
// - Simpler but less compatible

// Option 3: Origin header check
// - Verify Origin/Referer matches expected domain
// - Simple, no token management
```

**Recommendation:** Origin header check for Phase 2, upgrade later if needed

### Phase 4: Client Updates

**Pool creation flow:**
```
1. POST /api/pools → returns { inviteCode, captainSecret }
2. Server sets cookie: pwp_auth={ [inviteCode]: captainSecret }
3. Redirect to /pool/[code]/captain (no secret in URL)
4. Subsequent requests automatically include cookie
```

**Join flow:**
```
1. POST /api/pools/[code]/join → returns { secret }
2. Server sets cookie: pwp_auth={ ..., [code]: secret }
3. Redirect to /pool/[code]/picks (no secret in URL)
```

---

## Migration Strategy

### Backward Compatibility

During migration, support both:
```typescript
function getSecret(code: string, request: Request): string | null {
  // Try cookie first
  const cookieSecret = getPoolSecret(code, request);
  if (cookieSecret) return cookieSecret;

  // Fall back to query param (deprecated)
  const url = new URL(request.url);
  return url.searchParams.get('secret');
}
```

### Deprecation Timeline

1. **Week 1**: Add cookie support, keep query param
2. **Week 2**: Default to cookie, log query param usage
3. **Week 3**: Remove query param support
4. **Week 4**: Clean up migration code

---

## Decisions (Confirmed)

1. **Cookie name:** `pwp_auth`
   - Short, unique, matches app abbreviation

2. **Cookie expiration:** 30 days, sliding window
   - Refresh on each request (active users stay logged in)
   - Long enough for multi-day events

3. **Max pools per cookie:** No explicit limit
   - Cookie size limit is 4KB
   - Each pool entry ~50 bytes (code + UUID)
   - ~80 pools max, plenty of headroom

4. **Cookie cleared:** Accept loss for Phase 2
   - User loses access to pools
   - Add recovery/rejoin flow in Phase 3 if needed

5. **CSRF approach:** Origin header check
   - Simple, no token management
   - Upgrade to double-submit cookie later if needed

---

## Security Considerations

- [ ] Cookie flags: `HttpOnly`, `Secure`, `SameSite=Lax`
- [ ] CSRF protection for all mutations
- [ ] No secret in error messages or logs
- [ ] Validate cookie structure (prevent injection)
- [ ] Consider rate limiting on auth endpoints

---

## Testing Plan

1. **Unit tests**: Cookie encoding/decoding
2. **Integration tests**: Auth flow end-to-end
3. **Security tests**:
   - Verify HttpOnly (can't read from JS)
   - Verify SameSite (cross-origin blocked)
   - Verify CSRF protection works

---

## Files to Create/Modify

### New Files
- `src/lib/auth.ts` - Cookie management utilities
- `src/lib/csrf.ts` - CSRF protection (if using tokens)

### Modified Files
- All API routes - Use new auth helper
- `app/api/pools/route.ts` - Set cookie on create
- `app/api/pools/[code]/join/route.ts` - Set cookie on join
- Client components - Remove secret from URLs

---

*Status: Ready for implementation*
