/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { StyledRenderContext } from '@elastic/isomer-sdk';
import { render, screen } from '@testing-library/react';

import type { CalloutNode } from '../fixtures/components_pack';
import { componentsPack } from '../fixtures/components_pack';
import { composeExample } from '../model/compose_example';
import { compositionKey } from '../model/composition_key';
import type { PngManifest } from '../model/png_manifest';
import { PngSurface } from '../surfaces/png_surface';

import { staticHost } from './static_host';

const runtime = createIsomerRuntime<unknown, StyledRenderContext, unknown>({
  packs: [componentsPack],
  frames: {
    card: {
      defaultWidth: 320,
      theme: { light: undefined, dark: undefined },
      estimateHeight: () => 100,
      wrap: (_header, body) => <div>{body}</div>,
    },
  },
});

const example: CalloutNode = { type: 'callout', body: 'Disk full.' };
const edited: CalloutNode = { type: 'callout', body: 'Edited in the browser.' };
const light = composeExample(undefined, [example], 'light');
const dark = composeExample(undefined, [example], 'dark');

const urlOf = (input: Parameters<typeof fetch>[0]): string =>
  typeof input === 'string'
    ? input
    : input instanceof URL
      ? input.href
      : input.url;

const respond = (body: BodyInit, type: string) =>
  new Response(body, { headers: { 'content-type': type } });

const serveManifest = async () => {
  const manifest: PngManifest = {
    version: 1,
    entries: {
      [await compositionKey(light)]: {
        file: 'light.png',
        primitive: 'callout',
        example: 'Example 1',
        theme: 'light',
      },
      [await compositionKey(dark)]: {
        file: 'dark.png',
        primitive: 'callout',
        example: 'Example 1',
        theme: 'dark',
      },
    },
  };
  const fetchMock = vi.fn<typeof fetch>((input) => {
    const url = urlOf(input);
    if (url.endsWith('/png/manifest.json')) {
      return Promise.resolve(
        respond(JSON.stringify(manifest), 'application/json')
      );
    }
    const [, file] = /\/png\/(\w+\.png)$/.exec(url) ?? [];
    return Promise.resolve(
      file ? respond(file, 'image/png') : new Response('', { status: 404 })
    );
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
};

const requestedUrls = (fetchMock: ReturnType<typeof vi.fn<typeof fetch>>) =>
  fetchMock.mock.calls.map(([input]) => urlOf(input));

describe('staticHost', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('looks each composition up in the manifest next to the page', async () => {
    const fetchMock = await serveManifest();
    const { rasterizePng } = staticHost({ runtime });
    const { signal } = new AbortController();

    expect((await rasterizePng?.(light, { signal }))?.size).toBe(
      'light.png'.length
    );
    expect((await rasterizePng?.(dark, { signal }))?.size).toBe(
      'dark.png'.length
    );
    expect(requestedUrls(fetchMock)).toEqual([
      new URL('png/manifest.json', document.baseURI).href,
      new URL('png/light.png', document.baseURI).href,
      new URL('png/dark.png', document.baseURI).href,
    ]);
  });

  it('shows why an edited composition has no PNG', async () => {
    await serveManifest();
    const { rasterizePng } = staticHost({ runtime });
    const composition = composeExample(undefined, [edited], 'light');
    if (!rasterizePng) {
      throw new Error('The runtime has a snapshot surface.');
    }

    render(<PngSurface {...{ composition, rasterizePng }} />);

    expect(await screen.findByText('No prerendered PNG')).toBeInTheDocument();
    expect(screen.getByText('isomer-studio dev')).toBeInTheDocument();
  });

  it('has no rasterizer without a snapshot surface', () => {
    const plain = createIsomerRuntime<unknown, StyledRenderContext>({
      packs: [componentsPack],
    });
    expect(staticHost({ runtime: plain }).rasterizePng).toBeUndefined();
  });
});
