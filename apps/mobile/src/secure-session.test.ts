import { describe, it, expect } from 'vitest';
import { secureSessionStorage } from './secure-session';
function fixture() {
  const data = new Map<string, string>();
  let fail = false;
  const storage = secureSessionStorage({
    get: async (key) => data.get(key) ?? null,
    set: async (key, value) => {
      if (fail && key.endsWith('.manifest')) throw new Error('Device write failed');
      data.set(key, value);
    },
    remove: async (key) => {
      data.delete(key);
    },
  });
  return {
    data,
    storage,
    fail: () => {
      fail = true;
    },
  };
}
describe('native encrypted session chunks', () => {
  it('round-trips non-ASCII credentials within per-item byte bounds', async () => {
    const { data, storage } = fixture();
    const value = '🙂漢'.repeat(2500);
    await storage.setItem('auth', value);
    expect(await storage.getItem('auth')).toBe(value);
    expect([...data.values()].every((v) => new TextEncoder().encode(v).byteLength <= 1800)).toBe(
      true,
    );
  });
  it('preserves the prior committed session if a manifest write fails', async () => {
    const f = fixture();
    await f.storage.setItem('auth', 'original');
    const before = [...f.data];
    f.fail();
    await expect(f.storage.setItem('auth', 'new'.repeat(2000))).rejects.toThrow();
    expect(await f.storage.getItem('auth')).toBe('original');
    expect([...f.data]).toEqual(before);
  });
  it('removes obsolete encrypted chunks after refresh', async () => {
    const f = fixture();
    await f.storage.setItem('auth', 'a'.repeat(10000));
    await f.storage.setItem('auth', 'new');
    expect(f.data.size).toBe(2);
    expect(await f.storage.getItem('auth')).toBe('new');
  });
  it('serializes refresh and sign-out so stale writes cannot restore a session', async () => {
    const f = fixture();
    await Promise.all([
      f.storage.setItem('auth', 'first'),
      f.storage.setItem('auth', 'second'),
      f.storage.removeItem('auth'),
    ]);
    expect(await f.storage.getItem('auth')).toBe(null);
    expect(f.data.size).toBe(0);
  });
  it('fails closed for partial credentials', async () => {
    const f = fixture();
    await f.storage.setItem('auth', 'a'.repeat(2000));
    const key = [...f.data.keys()].find((k) => k.endsWith('.0'))!;
    f.data.delete(key);
    expect(await f.storage.getItem('auth')).toBe(null);
  });
  it('clears only credentials owned by this adapter', async () => {
    const f = fixture();
    f.data.set('unrelated', 'retained');
    await f.storage.setItem('auth', 'one');
    await f.storage.setItem('verifier', 'two');
    await f.storage.clear();
    expect([...f.data]).toEqual([['unrelated', 'retained']]);
  });
  it('rejects excessive byte lengths before committing', async () => {
    const f = fixture();
    await expect(f.storage.setItem('auth', '🙂'.repeat(15000))).rejects.toThrow();
    expect(f.data.size).toBe(0);
  });
});
