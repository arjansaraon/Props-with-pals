/**
 * Creates a base64-encoded pwp_auth cookie value for test requests.
 */
export function createAuthCookie(code: string, secret: string): string {
  const data = { pools: { [code]: secret } };
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

/**
 * Creates a Cookie header string for test requests.
 */
export function createCookieHeader(code: string, secret: string): string {
  return `pwp_auth=${createAuthCookie(code, secret)}`;
}
