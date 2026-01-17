// Rate limiting using KV

export async function checkRateLimit(
  kv: KVNamespace,
  key: string,
  maxRequests: number,
  windowSeconds: number = 60
): Promise<boolean> {
  const rateLimitKey = `ratelimit:${key}`;
  
  const current = await kv.get(rateLimitKey);
  const count = current ? parseInt(current, 10) : 0;

  if (count >= maxRequests) {
    return false;
  }

  // Increment counter
  await kv.put(rateLimitKey, String(count + 1), {
    expirationTtl: windowSeconds,
  });

  return true;
}

// Cache municipality lookup
export async function getCachedMunicipality(
  kv: KVNamespace,
  lat: number,
  lng: number
): Promise<string | null> {
  // Round to 2 decimal places for cache key
  const key = `municipality:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  return await kv.get(key);
}

export async function cacheMunicipality(
  kv: KVNamespace,
  lat: number,
  lng: number,
  municipality: string
): Promise<void> {
  const key = `municipality:${lat.toFixed(2)}:${lng.toFixed(2)}`;
  await kv.put(key, municipality, { expirationTtl: 86400 }); // 24 hours
}
