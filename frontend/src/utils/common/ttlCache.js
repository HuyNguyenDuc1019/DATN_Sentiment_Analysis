const entries = new Map();
const pending = new Map();
const MAX_ENTRIES = 150;

function storeEntry(key, value, ttl) {
  entries.set(key, { value, expiresAt: Date.now() + ttl });

  while (entries.size > MAX_ENTRIES) {
    entries.delete(entries.keys().next().value);
  }
}

export async function cachedRequest(key, loader, options = {}) {
  const ttl = Number(options.ttl ?? 60_000);
  const force = Boolean(options.force);
  const staleIfError = options.staleIfError !== false;
  const now = Date.now();
  const current = entries.get(key);

  if (!force && current && current.expiresAt > now) return current.value;
  if (!force && pending.has(key)) return pending.get(key);

  const request = Promise.resolve()
    .then(loader)
    .then((value) => {
      storeEntry(key, value, ttl);
      pending.delete(key);
      return value;
    })
    .catch((error) => {
      pending.delete(key);
      // Mạng chập chờn không làm Dashboard trắng nếu trước đó đã có dữ liệu.
      if (staleIfError && current) return current.value;
      throw error;
    });

  pending.set(key, request);
  return request;
}

export function invalidateCache(prefix = '') {
  [...entries.keys()].forEach((key) => {
    if (!prefix || key.startsWith(prefix)) entries.delete(key);
  });
}
