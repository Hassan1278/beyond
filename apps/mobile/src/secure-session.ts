interface EncryptedStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
}
/** Small encrypted chunks avoid platform SecureStore item-size limits. */
export function secureSessionStorage(store: EncryptedStore) {
  const owned = new Set<string>();
  let writes: Promise<void> = Promise.resolve();
  let sequence = 0;
  const key = (name: string) => 'beyond.' + name.replace(/[^A-Za-z0-9_.-]/g, '_');
  const manifest = async (base: string): Promise<{ id: string; count: number } | null> => {
    const raw = await store.get(base + '.manifest');
    if (!raw) return null;
    try {
      const value = JSON.parse(raw);
      return typeof value.id === 'string' &&
        /^[a-z0-9-]+$/.test(value.id) &&
        Number.isInteger(value.count) &&
        value.count > 0 &&
        value.count <= 32
        ? value
        : null;
    } catch {
      return null;
    }
  };
  const erase = async (base: string, old: { id: string; count: number } | null) => {
    if (old)
      await Promise.all(
        Array.from({ length: old.count }, (_, i) => store.remove(base + '.' + old.id + '.' + i)),
      );
  };
  const serialized = (work: () => Promise<void>) => {
    const next = writes.then(work);
    writes = next.catch(() => undefined);
    return next;
  };
  return {
    getItem: async (name: string): Promise<string | null> => {
      owned.add(name);
      await writes;
      const base = key(name);
      const saved = await manifest(base);
      if (!saved) return null;
      const chunks = await Promise.all(
        Array.from({ length: saved.count }, (_, i) => store.get(base + '.' + saved.id + '.' + i)),
      );
      return chunks.every((chunk) => typeof chunk === 'string') ? chunks.join('') : null;
    },
    setItem: (name: string, value: string): Promise<void> =>
      serialized(async () => {
        owned.add(name);
        if (!value || value.length > 57600)
          throw new Error('Session exceeds secure storage limits.');
        const base = key(name);
        const old = await manifest(base);
        const chunks: string[] = [];
        let chunk = '',
          bytes = 0;
        for (const character of value) {
          const size = new TextEncoder().encode(character).byteLength;
          if (bytes + size > 1800) {
            chunks.push(chunk);
            chunk = '';
            bytes = 0;
          }
          chunk += character;
          bytes += size;
        }
        if (chunk) chunks.push(chunk);
        if (chunks.length > 32) throw new Error('Session exceeds secure storage limits.');
        const next = {
          id: Date.now().toString(36) + '-' + (++sequence).toString(36),
          count: chunks.length,
        };
        try {
          for (let i = 0; i < next.count; i++)
            await store.set(base + '.' + next.id + '.' + i, chunks[i]!);
          await store.set(base + '.manifest', JSON.stringify(next));
        } catch (error) {
          await erase(base, next);
          throw error;
        }
        await erase(base, old);
      }),
    clear: (): Promise<void> =>
      serialized(async () => {
        for (const name of owned) {
          const base = key(name);
          const old = await manifest(base);
          await store.remove(base + '.manifest');
          await erase(base, old);
        }
        owned.clear();
      }),
    removeItem: (name: string): Promise<void> =>
      serialized(async () => {
        owned.add(name);
        const base = key(name);
        const old = await manifest(base);
        await store.remove(base + '.manifest');
        await erase(base, old);
      }),
  };
}
