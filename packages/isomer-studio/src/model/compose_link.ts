/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** The composition editor's source formats. */
export type ComposeFormat = 'jsx' | 'json';

/** A primitive example to seed the composition editor from. */
export interface ComposeExampleRef {
  type: string;
  index: number;
}

/** What `#/compose?…` asks the composition editor to load. */
export interface ComposeParams {
  /** Source compressed by {@link encodeSource}. */
  code?: string | undefined;
  /** A URL to fetch the source from. */
  src?: string | undefined;
  lang?: ComposeFormat | undefined;
  example?: ComposeExampleRef | undefined;
}

/** Links longer than this are better shared as a hosted file and `src=`. */
export const LONG_LINK = 8_000;

/** The most a `src=` fetch reads. */
export const MAX_SOURCE_BYTES = 1_000_000;

const FETCH_TIMEOUT_MS = 10_000;

const isFormat = (value: string | null): value is ComposeFormat =>
  value === 'jsx' || value === 'json';

const parseExample = (value: string | null): ComposeExampleRef | undefined => {
  if (!value) {
    return undefined;
  }
  const slash = value.lastIndexOf('/');
  const type = slash < 0 ? value : value.slice(0, slash);
  const index = slash < 0 ? 0 : Number(value.slice(slash + 1));
  return type && Number.isInteger(index) && index >= 0
    ? { type, index }
    : undefined;
};

/** Reads the query after `#/compose`, with or without its `?`. */
export const parseComposeQuery = (query: string): ComposeParams => {
  const search = new URLSearchParams(query.replace(/^\?/, ''));
  const lang = search.get('lang');
  const params: ComposeParams = {};
  const code = search.get('code');
  const src = search.get('src');
  const example = parseExample(search.get('example'));
  if (code) {
    params.code = code;
  }
  if (src) {
    params.src = src;
  }
  if (isFormat(lang)) {
    params.lang = lang;
  }
  if (example) {
    params.example = example;
  }
  return params;
};

/** `?code=…&lang=…`, or an empty string when there is nothing to load. */
export const formatComposeQuery = ({
  code,
  src,
  lang,
  example,
}: ComposeParams): string => {
  const search = new URLSearchParams();
  if (code) {
    search.set('code', code);
  }
  if (src) {
    search.set('src', src);
  }
  if (example) {
    search.set('example', `${example.type}/${example.index}`);
  }
  if (lang && (code || src)) {
    search.set('lang', lang);
  }
  const query = search.toString();
  return query ? `?${query}` : '';
};

class SourceTooLargeError extends Error {
  constructor(limit: number) {
    super(`The source is larger than ${limit} bytes.`);
    this.name = 'SourceTooLargeError';
  }
}

const readAll = async (
  stream: ReadableStream<Uint8Array>,
  limit = Infinity
): Promise<Uint8Array> => {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      throw new SourceTooLargeError(limit);
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
};

const through = (
  bytes: Uint8Array,
  transform: CompressionStream | DecompressionStream,
  limit = Infinity
): Promise<Uint8Array> => {
  const input = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(bytes);
      controller.close();
    },
  });
  return readAll(
    input.pipeThrough(
      transform as ReadableWritablePair<Uint8Array, Uint8Array>
    ),
    limit
  );
};

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
};

const fromBase64Url = (text: string): Uint8Array => {
  const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

/** Source as a URL-safe `code` payload: UTF-8, raw deflate, then base64url. */
export const encodeSource = async (source: string): Promise<string> =>
  toBase64Url(
    await through(
      new TextEncoder().encode(source),
      new CompressionStream('deflate-raw')
    )
  );

/**
 * Reverses {@link encodeSource}, with one message for any payload it can't read. Stops
 * inflating past {@link MAX_SOURCE_BYTES}, so a small link can't expand to fill the tab's memory.
 */
export const decodeSource = async (payload: string): Promise<string> => {
  let bytes: Uint8Array;
  try {
    bytes = await through(
      fromBase64Url(payload),
      new DecompressionStream('deflate-raw'),
      MAX_SOURCE_BYTES
    );
  } catch (error) {
    if (error instanceof SourceTooLargeError) {
      throw error;
    }
    throw new Error('The link’s `code` is not a source this Studio wrote.');
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('The link’s `code` is not a source this Studio wrote.');
  }
};

/** JSX for a `.tsx` or `.jsx` path, JSON for anything else. */
export const formatOfUrl = (url: URL): ComposeFormat =>
  /\.[jt]sx$/i.test(url.pathname) ? 'jsx' : 'json';

/**
 * The URL `src` names, resolved against `base`, when it is `https:` or on `base`'s origin;
 * otherwise an error that says so.
 */
export const resolveSourceUrl = (src: string, base: string): URL => {
  let url: URL;
  try {
    url = new URL(src, base);
  } catch {
    throw new Error(`\`${src}\` is not a URL.`);
  }
  if (url.protocol !== 'https:' && url.origin !== new URL(base).origin) {
    throw new Error(
      `\`${src}\` must be an https: URL or on this Studio’s origin.`
    );
  }
  return url;
};

/** Fetches `src` with {@link resolveSourceUrl}'s rules, a size cap and a timeout. */
export const fetchSource = async (
  src: string,
  {
    base,
    signal,
    fetch: fetchImpl = fetch,
  }: { base: string; signal?: AbortSignal; fetch?: typeof fetch }
): Promise<{ source: string; format: ComposeFormat }> => {
  const url = resolveSourceUrl(src, base);
  const timeout = AbortSignal.timeout(FETCH_TIMEOUT_MS);
  let response: Response;
  try {
    response = await fetchImpl(url, {
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      credentials: 'omit',
    });
  } catch (error) {
    if (signal?.aborted) {
      throw error;
    }
    throw new Error(
      `Could not fetch \`${url.href}\`. It may not exist, or its server may not allow cross-origin requests.`
    );
  }
  if (!response.ok) {
    throw new Error(`Fetching \`${url.href}\` answered ${response.status}.`);
  }
  const length = Number(response.headers.get('content-length'));
  if (length > MAX_SOURCE_BYTES) {
    throw new SourceTooLargeError(MAX_SOURCE_BYTES);
  }
  const bytes = response.body
    ? await readAll(response.body, MAX_SOURCE_BYTES)
    : new Uint8Array();
  return { source: new TextDecoder().decode(bytes), format: formatOfUrl(url) };
};
