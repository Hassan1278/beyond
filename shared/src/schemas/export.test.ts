import { describe, expect, it } from 'vitest';
import { accountExportQuerySchema, accountExportPageSchema } from './export';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const metadata = { format_version: 1, exported_at: '2026-10-10T00:00:00.123456Z' };
describe('private export contracts', () => {
  it.each(['settings', 'entries', 'memories', 'todos'])(
    'accepts explicit section %s',
    (section) => {
      expect(accountExportQuerySchema.safeParse({ section }).success).toBe(true);
    },
  );
  it.each([
    {},
    { section: 'profiles' },
    { section: 'entries', owner_id: id },
    { section: 'settings', limit: '1' },
    { section: 'settings', cursor: 'abc' },
    { section: 'entries', limit: '51' },
    { section: 'entries', limit: '01' },
    { section: 'entries', limit: 1 },
    { section: 'entries', cursor: '!!!' },
  ])('rejects unbounded, injected or ambiguous export input %#', (query) => {
    expect(accountExportQuerySchema.safeParse(query).success).toBe(false);
  });
  it('rejects leaked private metadata and cross-section resource types', () => {
    const page = { ...metadata, section: 'memories', items: [], next_cursor: null };
    expect(accountExportPageSchema.safeParse(page).success).toBe(true);
    for (const invalid of [
      { ...page, token: 'private-token' },
      { ...page, format_version: 2 },
      { ...page, exported_at: '0000-01-01T00:00:00Z' },
      {
        ...page,
        items: [
          {
            id,
            title: 'Todo',
            completed: false,
            revision: 1,
            created_at: metadata.exported_at,
            updated_at: metadata.exported_at,
          },
        ],
      },
    ])
      expect(accountExportPageSchema.safeParse(invalid).success).toBe(false);
  });
});
