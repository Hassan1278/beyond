import { describe, expect, it } from 'vitest';
import {
  createMemorySchema,
  patchSettingsSchema,
  patchTodoSchema,
  patchMemorySchema,
  timezoneSchema,
} from './product';
const id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
describe('explicit private product inputs', () => {
  it.each(['Asia/Hong_Kong', 'America/New_York', 'Etc/UTC', 'UTC'])(
    'accepts named timezone %s',
    (value) => expect(timezoneSchema.safeParse(value).success).toBe(true),
  );
  it.each(['+08:00', 'Mars/Nowhere', 'Asia/Hong_Kong\n', '', null])(
    'rejects invalid timezone %s',
    (value) => expect(timezoneSchema.safeParse(value).success).toBe(false),
  );
  it.each([
    { expected_revision: 1 },
    { expected_revision: 1, reflection_enabled: true },
    { expected_revision: 1, owner_id: id },
    { expected_revision: 1, memory_paused: 'false' },
    { expected_revision: 0, voice: 'friend' },
    { expected_revision: 1, morning_time: '03:00' },
  ])('rejects unsafe settings patch %#', (value) =>
    expect(patchSettingsSchema.safeParse(value).success).toBe(false),
  );
  it('requires explicit approval and source choice', () => {
    const base = { text: 'Fictional memory', source_entry_id: null, idempotency_key: id };
    expect(createMemorySchema.safeParse(base).success).toBe(false);
    expect(createMemorySchema.safeParse({ ...base, approved: false }).success).toBe(false);
    expect(createMemorySchema.safeParse({ ...base, approved: true }).success).toBe(true);
  });
  it.each([' ', '\u0000', '\ud800', '😀'.repeat(1001)])(
    'rejects invalid/bounded memory text %#',
    (text) =>
      expect(
        createMemorySchema.safeParse({
          text,
          source_entry_id: null,
          approved: true,
          idempotency_key: id,
        }).success,
      ).toBe(false),
  );
  it('requires a real todo change and an expected revision', () => {
    expect(patchTodoSchema.safeParse({ expected_revision: 1 }).success).toBe(false);
    expect(patchTodoSchema.safeParse({ completed: false, expected_revision: 1 }).success).toBe(
      true,
    );
    expect(patchTodoSchema.safeParse({ completed: true }).success).toBe(false);
  });
  it('requires renewed explicit approval and a revision for memory edits', () => {
    const body = { text: 'Corrected fictional memory', expected_revision: 1, approved: true };
    expect(patchMemorySchema.safeParse(body).success).toBe(true);
    for (const invalid of [
      { ...body, approved: false },
      { text: body.text, expected_revision: 1 },
      { ...body, expected_revision: 0 },
      { ...body, text: '\ud800' },
      { ...body, text: '😀'.repeat(1001) },
      { ...body, source_entry_id: id },
      { ...body, owner_id: id },
    ])
      expect(patchMemorySchema.safeParse(invalid).success).toBe(false);
  });
});
