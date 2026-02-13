/**
 * Extract a human-readable error message from an axios error.
 * When responseType is 'stream', err.response.data is a readable stream,
 * not a parsed JSON object, so we need to read it manually.
 */
export async function readStreamError(err: any, providerLabel: string): Promise<string> {
  // Timeout
  if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
    return `${providerLabel}: Request timed out`;
  }

  // Network error (no response at all)
  if (!err.response) {
    return `${providerLabel}: ${err.message || 'Network error'}`;
  }

  const status = err.response.status;

  // Try to read the response body if it's a stream
  if (err.response.data && typeof err.response.data.on === 'function') {
    try {
      const chunks: Buffer[] = [];
      for await (const chunk of err.response.data) {
        chunks.push(Buffer.from(chunk));
      }
      const body = Buffer.concat(chunks).toString('utf-8');
      try {
        const parsed = JSON.parse(body);
        const msg = parsed?.error?.message || parsed?.error || parsed?.message || body.slice(0, 200);
        return `${providerLabel} (${status}): ${msg}`;
      } catch {
        return `${providerLabel} (${status}): ${body.slice(0, 200)}`;
      }
    } catch {
      return `${providerLabel} (${status}): Failed to read error response`;
    }
  }

  // Standard JSON error response
  const msg = err.response?.data?.error?.message
    || err.response?.data?.error
    || err.response?.data?.message
    || err.message;
  return `${providerLabel} (${status}): ${msg}`;
}
