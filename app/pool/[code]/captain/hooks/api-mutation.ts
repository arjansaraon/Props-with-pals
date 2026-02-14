interface ApiMutationOptions {
  url: string;
  method: 'PATCH' | 'POST' | 'DELETE';
  body?: unknown;
  errorFallback: string;
}

/**
 * Makes an API call and returns a result object.
 * Handles fetch errors and non-ok responses uniformly.
 */
export async function apiMutation(
  options: ApiMutationOptions
): Promise<{ ok: true } | { ok: false; message: string }> {
  try {
    const init: RequestInit = { method: options.method };
    if (options.body !== undefined) {
      init.headers = { 'Content-Type': 'application/json' };
      init.body = JSON.stringify(options.body);
    }
    const response = await fetch(options.url, init);
    if (!response.ok) {
      const data = await response.json();
      return { ok: false, message: data.message || options.errorFallback };
    }
    return { ok: true };
  } catch {
    return { ok: false, message: options.errorFallback };
  }
}
