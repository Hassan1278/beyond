import { describe, expect, it } from 'vitest';
import { entrySchema, entryCursorSchema, entryListSchema, entryListQuerySchema } from '../index';

const entry = {
  id: '11111111-1111-4111-8111-111111111111',
  text: ' Fictional writing.\n',
  revision: 1,
  reflection_opt_in: false,
  created_at: '2026-10-09T15:00:00.123456Z',
  updated_at: '2026-10-09T15:00:00.123456Z',
};

describe('portable writing output and pagination contracts', () => {
  it('preserves text and UTC microseconds without runtime-specific imports', () => {
    expect(entrySchema.parse(entry)).toEqual(entry);
    expect(entryCursorSchema.parse({ created_at: entry.created_at, id: entry.id })).toEqual({
      created_at: entry.created_at,
      id: entry.id,
    });
  });
  it.each(['owner_id', 'original_text', 'idempotency_key', 'deleted_at'])(
    'rejects private field %s',
    (key) => {
      expect(entrySchema.safeParse({ ...entry, [key]: 'private' }).success).toBe(false);
    },
  );
  it.each([
    '0000-01-01T00:00:00Z',
    '2026-10-09T15:00:00+00:00',
    '2026-02-30T00:00:00Z',
    'infinity',
  ])('rejects invalid UTC timestamp %s', (created_at) => {
    expect(entryCursorSchema.safeParse({ created_at, id: entry.id }).success).toBe(false);
  });
  it.each(['1', '20', '100'])('accepts canonical bounded limit %s', (limit) => {
    expect(entryListQuerySchema.parse({ limit })).toEqual({ limit });
  });
  it.each(['0', '020', '101', '1.5', '-1', '1e2', ''])('rejects invalid limit %s', (limit) => {
    expect(entryListQuerySchema.safeParse({ limit }).success).toBe(false);
  });
  it('caps pages and cursor size and rejects unknown query fields', () => {
    expect(entryListSchema.parse({ entries: [entry], next_cursor: null }).entries).toHaveLength(1);
    expect(
      entryListSchema.safeParse({ entries: Array(101).fill(entry), next_cursor: null }).success,
    ).toBe(false);
    expect(entryListQuerySchema.safeParse({ cursor: 'A'.repeat(513) }).success).toBe(false);
    expect(entryListQuerySchema.safeParse({ owner_id: entry.id }).success).toBe(false);
  });
});
