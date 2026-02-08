import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'pwp_auth';
const COOKIE_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

interface AuthCookieData {
  pools: Record<string, string>; // { inviteCode: secret }
}

/**
 * Parses the auth cookie and returns the data.
 * Returns empty pools object if cookie is missing or invalid.
 */
function parseAuthCookie(cookieValue: string | undefined): AuthCookieData {
  if (!cookieValue) {
    return { pools: {} };
  }

  try {
    const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
    const data = JSON.parse(decoded) as AuthCookieData;

    // Validate structure
    if (typeof data.pools !== 'object' || data.pools === null) {
      return { pools: {} };
    }

    return data;
  } catch {
    return { pools: {} };
  }
}

/**
 * Encodes auth data to cookie value.
 */
function encodeAuthCookie(data: AuthCookieData): string {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Gets the secret for a specific pool from cookies.
 * For use in API routes. Returns null if cookies not available (e.g., in tests).
 */
export async function getPoolSecret(code: string): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const cookieValue = cookieStore.get(COOKIE_NAME)?.value;
    const data = parseAuthCookie(cookieValue);
    return data.pools[code] ?? null;
  } catch {
    // cookies() throws when called outside request scope (e.g., in tests)
    return null;
  }
}

/**
 * Gets the secret from cookies, with query param fallback for testing.
 * In production, cookies are the only auth mechanism.
 * Query params are only used in development/test environments.
 */
export async function getSecret(code: string, request: Request): Promise<string | null> {
  // Try cookies first (preferred and required in production)
  const cookieSecret = await getPoolSecret(code);
  if (cookieSecret) {
    return cookieSecret;
  }

  // Fallback to query params ONLY in development/test (never in production)
  // Query params in URLs can leak via logs, referrer headers, and browser history
  if (process.env.NODE_ENV !== 'production') {
    const url = new URL(request.url);
    return url.searchParams.get('secret');
  }

  return null;
}

/**
 * Creates a response with the auth cookie set.
 * Used after pool creation or join to store the secret.
 */
export async function setPoolSecretCookie(
  code: string,
  secret: string,
  response: NextResponse
): Promise<NextResponse> {
  try {
    const cookieStore = await cookies();
    const existingCookie = cookieStore.get(COOKIE_NAME)?.value;
    const data = parseAuthCookie(existingCookie);

    // Add new pool secret
    data.pools[code] = secret;

    // Set updated cookie on response
    response.cookies.set(COOKIE_NAME, encodeAuthCookie(data), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  } catch {
    // cookies() throws when called outside request scope (e.g., in tests)
    // In this case, just set the cookie without merging existing data
    const data: AuthCookieData = { pools: { [code]: secret } };
    response.cookies.set(COOKIE_NAME, encodeAuthCookie(data), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  return response;
}

/**
 * Creates a NextResponse.json with the auth cookie set.
 * Convenience function for API routes that return JSON.
 */
export async function jsonResponseWithAuth<T>(
  data: T,
  code: string,
  secret: string,
  status = 200
): Promise<NextResponse> {
  const response = NextResponse.json(data, { status });
  return setPoolSecretCookie(code, secret, response);
}

/**
 * Removes a pool's secret from the cookie.
 * Used when leaving a pool (future feature).
 */
export async function clearPoolSecretCookie(
  code: string,
  response: NextResponse
): Promise<NextResponse> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(COOKIE_NAME)?.value;
  const data = parseAuthCookie(existingCookie);

  // Remove pool secret
  delete data.pools[code];

  // If no pools left, delete the cookie entirely
  if (Object.keys(data.pools).length === 0) {
    response.cookies.delete(COOKIE_NAME);
  } else {
    response.cookies.set(COOKIE_NAME, encodeAuthCookie(data), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: COOKIE_MAX_AGE,
      path: '/',
    });
  }

  return response;
}

/**
 * Validates the Origin header for CSRF protection.
 * Returns true if the request is from an allowed origin.
 * Requires at least one of Origin or Referer headers to be present.
 */
export function validateOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const referer = request.headers.get('referer');

  // Require at least one header for CSRF protection
  // Note: curl users should add -H "Origin: http://localhost:3000" to their commands
  if (!origin && !referer) {
    return false;
  }

  // Get expected host
  const host = request.headers.get('host');
  if (!host) {
    return false;
  }

  // Check origin matches
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (originUrl.host === host) {
        return true;
      }
    } catch {
      return false;
    }
  }

  // Check referer matches (fallback)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      if (refererUrl.host === host) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

/**
 * CSRF protection middleware for mutations.
 * Returns an error response if CSRF check fails, null if valid.
 */
export function requireValidOrigin(request: Request): NextResponse | null {
  if (!validateOrigin(request)) {
    return NextResponse.json(
      { code: 'CSRF_ERROR', message: 'Invalid request origin' },
      { status: 403 }
    );
  }
  return null;
}

/**
 * Refreshes the auth cookie to extend expiration (sliding window).
 * Call this on successful authenticated requests.
 */
export async function refreshAuthCookie(response: NextResponse): Promise<NextResponse> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(COOKIE_NAME)?.value;

  if (existingCookie) {
    const data = parseAuthCookie(existingCookie);
    if (Object.keys(data.pools).length > 0) {
      response.cookies.set(COOKIE_NAME, encodeAuthCookie(data), {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: COOKIE_MAX_AGE,
        path: '/',
      });
    }
  }

  return response;
}

/**
 * Compares two secrets using timing-safe comparison to prevent timing attacks.
 * Returns true if secrets match, false otherwise.
 */
export function safeCompareSecrets(a: string | null, b: string | null): boolean {
  if (!a || !b) return false;
  if (a.length !== b.length) return false;

  try {
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
