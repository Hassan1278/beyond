import { describe, expect, expectTypeOf, it } from 'vitest';
import * as shared from '../index';
import {
  createEntryBodySchema,
  entryParamsSchema,
  patchEntryBodySchema,
  type CreateEntryBody,
  type EntryParams,
  type PatchEntryBody,
} from './entries';

const uuid = '123e4567-e89b-42d3-a456-426614174000';
const createBody = {
  text: 'A fictional journal entry.',
  idempotency_key: uuid,
  reflection_opt_in: false,
} as const;
const patchBody = { text: 'An edited fictional entry.', expected_revision: 1 };

const bodyCases = [
  { name: 'create', schema: createEntryBodySchema, body: createBody },
  { name: 'patch', schema: patchEntryBodySchema, body: patchBody },
] as const;

describe.each(bodyCases)('$name entry body', ({ schema, body }) => {
  it('preserves leading, trailing and internal whitespace exactly', () => {
    const text = ' \tA fictional entry.\r\n\n  Another line.\t ';
    const input = { ...body, text };

    expect(schema.parse(input)).toStrictEqual(input);
  });

  it.each(['', ' ', '\t\r\n', '\u00a0\u2003'])('rejects blank text %j', (text) => {
    expect(schema.safeParse({ ...body, text }).success).toBe(false);
  });

  it.each(['entry\u0000', 'entry\uD800', '\uDC00entry', 'entry\uD800x'])(
    'rejects PostgreSQL-incompatible text %j',
    (text) => {
      expect(schema.safeParse({ ...body, text }).success).toBe(false);
    },
  );

  it('preserves valid paired Unicode', () => {
    const text = 'A fictional entry \uD83C\uDF31';
    expect(schema.parse({ ...body, text }).text).toBe(text);
  });

  it.each([1, 20_000])('accepts text at the %i-character boundary', (length) => {
    const text = 'x'.repeat(length);

    expect(schema.parse({ ...body, text }).text).toBe(text);
  });

  it('rejects text longer than 20,000 characters', () => {
    expect(schema.safeParse({ ...body, text: 'x'.repeat(20_001) }).success).toBe(false);
  });

  it('counts preserved whitespace toward the length limit', () => {
    const text = ` ${'x'.repeat(19_998)} `;

    expect(schema.parse({ ...body, text }).text).toBe(text);
    expect(schema.safeParse({ ...body, text: `${text} ` }).success).toBe(false);
  });

  it.each([undefined, null, 1, true, [], {}])('rejects non-string text %j', (text) => {
    expect(schema.safeParse({ ...body, text }).success).toBe(false);
  });

  it.each(['owner_id', 'user_id', 'owner', 'extra'])('rejects unknown field %s', (field) => {
    expect(schema.safeParse({ ...body, [field]: uuid }).success).toBe(false);
  });

  it.each([undefined, null, [], {}, 'entry'])('rejects invalid or empty bodies %j', (input) => {
    expect(schema.safeParse(input).success).toBe(false);
  });
});

describe('createEntryBodySchema', () => {
  it('accepts the exact writing-only body', () => {
    expect(createEntryBodySchema.parse(createBody)).toStrictEqual(createBody);
    expectTypeOf<CreateEntryBody['reflection_opt_in']>().toEqualTypeOf<false>();
    expectTypeOf(createEntryBodySchema.parse(createBody)).toEqualTypeOf<CreateEntryBody>();
  });

  it.each([true, undefined, null, 0, 'false'])('rejects unsupported opt-in %j', (optIn) => {
    expect(
      createEntryBodySchema.safeParse({ ...createBody, reflection_opt_in: optIn }).success,
    ).toBe(false);
  });

  it('requires explicit reflection_opt_in rather than defaulting it', () => {
    expect(
      createEntryBodySchema.safeParse({ text: createBody.text, idempotency_key: uuid }).success,
    ).toBe(false);
  });

  it.each([undefined, null, '', 'not-a-uuid', uuid.replaceAll('-', ''), 123])(
    'rejects invalid idempotency key %j',
    (idempotencyKey) => {
      expect(
        createEntryBodySchema.safeParse({ ...createBody, idempotency_key: idempotencyKey }).success,
      ).toBe(false);
    },
  );

  it('rejects a UUID-shaped key with an invalid variant', () => {
    expect(
      createEntryBodySchema.safeParse({
        ...createBody,
        idempotency_key: '123e4567-e89b-42d3-7456-426614174000',
      }).success,
    ).toBe(false);
  });

  it('requires an idempotency key', () => {
    expect(
      createEntryBodySchema.safeParse({ text: createBody.text, reflection_opt_in: false }).success,
    ).toBe(false);
  });

  it.each(['due_at', 'timezone', 'morning_time'])('rejects scheduling field %s', (field) => {
    expect(createEntryBodySchema.safeParse({ ...createBody, [field]: 'future' }).success).toBe(
      false,
    );
  });
});

describe('patchEntryBodySchema', () => {
  it.each([1, 2_147_483_647])('accepts revision boundary %i', (expectedRevision) => {
    const input = { ...patchBody, expected_revision: expectedRevision };

    expect(patchEntryBodySchema.parse(input)).toStrictEqual(input);
    expectTypeOf(patchEntryBodySchema.parse(input)).toEqualTypeOf<PatchEntryBody>();
  });

  it.each([undefined, null, -1, 0, 1.5, 2_147_483_648, NaN, Infinity, '1', true])(
    'rejects invalid revision %j',
    (expectedRevision) => {
      expect(
        patchEntryBodySchema.safeParse({ ...patchBody, expected_revision: expectedRevision })
          .success,
      ).toBe(false);
    },
  );

  it('requires an expected revision', () => {
    expect(patchEntryBodySchema.safeParse({ text: patchBody.text }).success).toBe(false);
  });

  it.each([false, true])('rejects opt-in changes in PATCH: %j', (optIn) => {
    expect(patchEntryBodySchema.safeParse({ ...patchBody, reflection_opt_in: optIn }).success).toBe(
      false,
    );
  });
});

describe('entryParamsSchema', () => {
  it('accepts an exact UUID parameter object', () => {
    expect(entryParamsSchema.parse({ id: uuid })).toStrictEqual({ id: uuid });
    expectTypeOf(entryParamsSchema.parse({ id: uuid })).toEqualTypeOf<EntryParams>();
  });

  it.each([undefined, null, '', 'not-a-uuid', uuid.replaceAll('-', ''), 123])(
    'rejects invalid UUID %j',
    (id) => {
      expect(entryParamsSchema.safeParse({ id }).success).toBe(false);
    },
  );

  it('rejects missing IDs and unknown owner fields', () => {
    expect(entryParamsSchema.safeParse({}).success).toBe(false);
    expect(entryParamsSchema.safeParse({ id: uuid, owner_id: uuid }).success).toBe(false);
  });
});

describe('shared entry exports', () => {
  it('re-exports the real entry schemas', () => {
    expect(shared.createEntryBodySchema).toBe(createEntryBodySchema);
    expect(shared.patchEntryBodySchema).toBe(patchEntryBodySchema);
    expect(shared.entryParamsSchema).toBe(entryParamsSchema);
    expectTypeOf<shared.CreateEntryBody>().toEqualTypeOf<CreateEntryBody>();
    expectTypeOf<shared.PatchEntryBody>().toEqualTypeOf<PatchEntryBody>();
    expectTypeOf<shared.EntryParams>().toEqualTypeOf<EntryParams>();
  });
});
