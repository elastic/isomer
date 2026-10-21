/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** @vitest-environment node */

import {
  decodeSource,
  encodeSource,
  fetchSource,
  formatComposeQuery,
  MAX_SOURCE_BYTES,
  parseComposeQuery,
  resolveSourceUrl,
} from './compose_link';

const BASE = 'http://localhost:5173/studio/';

describe('compose query', () => {
  it('round-trips every field', () => {
    const params = {
      code: 'abc_-',
      lang: 'jsx' as const,
      example: { type: 'statGroup', index: 2 },
    };
    expect(parseComposeQuery(formatComposeQuery(params))).toEqual(params);
  });

  it('is empty with nothing to load', () => {
    expect(formatComposeQuery({})).toBe('');
    expect(parseComposeQuery('')).toEqual({});
  });

  it('drops a lang with no source, an unknown lang and a bad example', () => {
    expect(formatComposeQuery({ lang: 'json' })).toBe('');
    expect(parseComposeQuery('?src=a.json&lang=ts&example=x/-1')).toEqual({
      src: 'a.json',
    });
  });

  it('reads an example without an index as its first', () => {
    expect(parseComposeQuery('example=callout')).toEqual({
      example: { type: 'callout', index: 0 },
    });
  });
});

describe('source codec', () => {
  it.each([
    ['ASCII', '<Composition>\n  <Callout>Hi</Callout>\n</Composition>'],
    ['non-ASCII', '{"type":"view","title":"Café ✓ 日本","body":[]}'],
    ['empty', ''],
  ])('round-trips %s source through a URL-safe payload', async (_, source) => {
    const payload = await encodeSource(source);
    expect(payload).toMatch(/^[\w-]*$/);
    await expect(decodeSource(payload)).resolves.toBe(source);
  });

  it('compresses repetitive source', async () => {
    const source = '<Callout>Disk full.</Callout>\n'.repeat(100);
    expect((await encodeSource(source)).length).toBeLessThan(
      source.length / 10
    );
  });

  it('stops inflating a payload past the source cap', async () => {
    const payload = await encodeSource('a'.repeat(MAX_SOURCE_BYTES + 1));
    expect(payload.length).toBeLessThan(5_000);
    await expect(decodeSource(payload)).rejects.toThrow('larger than');
  });

  it.each([
    ['not base64', '!!!'],
    ['not deflate', 'aGVsbG8'],
  ])('rejects a payload that is %s', async (_, payload) => {
    await expect(decodeSource(payload)).rejects.toThrow(
      'not a source this Studio wrote'
    );
  });
});

describe('resolveSourceUrl', () => {
  it('allows https and the same origin', () => {
    expect(resolveSourceUrl('https://example.com/a.tsx', BASE).href).toBe(
      'https://example.com/a.tsx'
    );
    expect(resolveSourceUrl('drafts/a.json', BASE).href).toBe(
      'http://localhost:5173/studio/drafts/a.json'
    );
  });

  it.each([
    'http://example.com/a.json',
    'javascript:alert(1)',
    'data:text/plain,{}',
  ])('rejects %s', (src) => {
    expect(() => resolveSourceUrl(src, BASE)).toThrow(/https: URL/);
  });
});

describe('fetchSource', () => {
  const respond = (body: string, init?: ResponseInit): typeof fetch =>
    vi.fn(() => Promise.resolve(new Response(body, init)));

  it('reads the source and infers the format from the path', async () => {
    const fetch = respond('<Composition />');
    await expect(
      fetchSource('https://example.com/a.tsx?raw=1', { base: BASE, fetch })
    ).resolves.toEqual({ source: '<Composition />', format: 'jsx' });
    await expect(
      fetchSource('a.json', { base: BASE, fetch: respond('{}') })
    ).resolves.toEqual({ source: '{}', format: 'json' });
  });

  it('reports a failed status', async () => {
    await expect(
      fetchSource('a.json', { base: BASE, fetch: respond('', { status: 404 }) })
    ).rejects.toThrow('answered 404');
  });

  it('refuses a source over the cap', async () => {
    await expect(
      fetchSource('a.json', {
        base: BASE,
        fetch: respond('x'.repeat(MAX_SOURCE_BYTES + 1)),
      })
    ).rejects.toThrow('larger than');
  });

  it('explains a network or CORS failure', async () => {
    const fetch: typeof globalThis.fetch = vi.fn(() =>
      Promise.reject(new TypeError('Failed to fetch'))
    );
    await expect(fetchSource('a.json', { base: BASE, fetch })).rejects.toThrow(
      'cross-origin'
    );
  });
});
