/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mkdtempSync } from 'node:fs';
import { createServer, request, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { TakumiMeasuringBackend } from '@elastic/isomer-image-takumi';
import type { SlideFrameNode } from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type DeckListing, handleStudio } from './app';
import type { DeckStore } from './host/deck';
import type { StudioState } from './state';
import { createDeckStore } from './store';

const stateKey = Symbol.for('elastic.isomer.slides_studio');

const PNG = new Uint8Array([137, 80, 78, 71]);

const slide = (
  title: string,
  ...body: SlideFrameNode['body']
): Composition<SlideFrameNode> => ({
  type: 'view',
  title,
  body: [
    {
      type: 'slideFrame',
      body: [{ type: 'slideHeading', title }, ...body],
    },
  ],
});

interface Reply {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  body: Buffer;
}

let server: Server;
let port: number;
let store: DeckStore;
let png: ReturnType<typeof vi.fn>;

const send = (
  method: string,
  path: string,
  headers: Record<string, string> = {}
): Promise<Reply> =>
  new Promise((resolve, reject) => {
    const req = request(
      { host: '127.0.0.1', port, method, path, headers },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () =>
          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers,
            body: Buffer.concat(chunks),
          })
        );
      }
    );
    req.on('error', reject);
    req.end();
  });

beforeEach(async () => {
  const dir = mkdtempSync(join(tmpdir(), 'studio-app-'));
  store = createDeckStore(dir);
  png = vi.fn(() => Promise.resolve(PNG));
  const takumi = { png, measure: vi.fn() };
  (globalThis as { [stateKey]?: StudioState })[stateKey] = {
    store,
    takumi: takumi as unknown as TakumiMeasuringBackend,
    sessions: new Map(),
  };
  server = createServer((req, res) => {
    handleStudio(
      req,
      res,
      () => {
        res.statusCode = 404;
        res.end();
      },
      dir
    ).catch(() => {
      res.statusCode = 500;
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  ({ port } = server.address() as AddressInfo);
});

afterEach(async () => {
  server.closeAllConnections();
  await new Promise((resolve) => server.close(resolve));
  delete (globalThis as { [stateKey]?: StudioState })[stateKey];
});

describe('DELETE /api/decks/<id>', () => {
  it('removes a deck asked for by the studio’s own origin', async () => {
    const { id } = store.create('Mine');
    const { status } = await send('DELETE', `/api/decks/${id}`, {
      origin: `http://127.0.0.1:${port}`,
    });
    expect(status).toBe(204);
    expect(store.get(id)).toBeUndefined();
  });

  it.each([
    ['another origin', 'http://evil.example'],
    ['an opaque origin', 'null'],
    ['an unparsable origin', 'http://['],
  ])('refuses %s', async (_label, origin) => {
    const { id } = store.create('Kept');
    const { status } = await send('DELETE', `/api/decks/${id}`, { origin });
    expect(status).toBe(403);
    expect(store.get(id)).toBeDefined();
  });
});

describe('GET /api/decks', () => {
  it('lists each deck with its first slide, references filled, as the cover', async () => {
    const { id } = store.create('Proof');
    store.update(id, () => [
      slide('Cover', { type: 'slideRender', slide: '1', surface: 'svg' }),
      slide('Shown'),
    ]);
    const [listing] = JSON.parse(
      (await send('GET', '/api/decks')).body.toString()
    ) as DeckListing[];
    const [frame] = listing!.cover!.body as SlideFrameNode[];
    expect(frame!.body[1]).toMatchObject({
      type: 'slideRender',
      composition: { title: 'Shown' },
    });
  });
});

describe('GET /png/<deck>/<index>.<theme>.png', () => {
  it('serves the slide’s PNG', async () => {
    const { id } = store.create('Look');
    store.update(id, () => [slide('Seen')]);
    const { status, headers, body } = await send(
      'GET',
      `/png/${id}/0.dark.png`
    );
    expect(status).toBe(200);
    expect(headers['content-type']).toBe('image/png');
    expect(new Uint8Array(body)).toEqual(PNG);
    expect(png).toHaveBeenCalledOnce();
  });

  it('answers 404 for a slide the deck does not have', async () => {
    const { id } = store.create('Short');
    const { status } = await send('GET', `/png/${id}/3.light.png`);
    expect(status).toBe(404);
    expect(png).not.toHaveBeenCalled();
  });
});

describe('GET /api/decks/<id>/events', () => {
  it('sends the deck, then a gone event and closes once it is removed', async () => {
    const { id } = store.create('Watched');
    const chunks: string[] = [];
    const ended = new Promise<void>((resolve, reject) => {
      const req = request(
        { host: '127.0.0.1', port, path: `/api/decks/${id}/events` },
        (res) => {
          res.setEncoding('utf8');
          res.on('data', (chunk: string) => {
            chunks.push(chunk);
            if (chunks.length === 1) {
              store.remove(id);
            }
          });
          res.on('end', resolve);
        }
      );
      req.on('error', reject);
      req.end();
    });
    await ended;
    expect(chunks.join('')).toMatch(
      /^data: \{.*"title":"Watched".*\}\n\nevent: gone\ndata: \n\n$/s
    );
  });
});
