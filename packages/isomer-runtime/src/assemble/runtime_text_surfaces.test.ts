/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitivePack } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { createIsomerRuntime } from './index';
import { boldPrimitive, notePrimitive, packOf, view } from './runtime.fixtures';

describe('createIsomerRuntime', () => {
  it('leaves out the title and subtitle on text, markdown, and slack when heading is false', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const spec = {
      ...view('Runtime owned'),
      title: 'Checkout',
      subtitle: 'last 15m',
    };

    expect(runtime.surfaces.text.render(spec, { heading: false })).toBe(
      'Runtime owned'
    );
    expect(runtime.surfaces.markdown.render(spec, { heading: false })).toBe(
      'Runtime owned'
    );
    expect(runtime.surfaces.slack.render(spec, { heading: false })).toEqual({
      text: 'Runtime owned',
      blocks: [
        { type: 'section', text: { type: 'mrkdwn', text: 'Runtime owned' } },
      ],
      assets: [],
    });
  });

  it("uploads a pack's picture types as Slack images rather than markdown", () => {
    // A chart cannot be drawn in Block Kit, so with a collector present the
    // dispatcher swaps it for an image block and an upload request. Only the
    // pack knows which of its types are pictures, so a runtime that failed to
    // carry the declaration through would silently degrade every chart posted
    // to Slack into a markdown approximation.
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.pictures',
          surfaces: [],
          primitives: [notePrimitive],
          slackAssetTypes: ['note'],
        }),
      ],
    });

    const result = runtime.surfaces.slack.render(view('Drawn'), {
      collectAssets: true,
    });

    expect(result.assets).toHaveLength(1);
    expect(result.blocks).toContainEqual(
      expect.objectContaining({ type: 'image' })
    );
  });

  it('renders a single node to Slack in the same shape as a composition', () => {
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.pictures',
          surfaces: [],
          primitives: [notePrimitive],
          slackAssetTypes: ['note'],
        }),
      ],
    });
    const node = { type: 'note' as const, text: 'Drawn' };

    const degraded = runtime.surfaces.slack.renderNode(node);
    expect(degraded).toEqual({
      text: 'Drawn',
      blocks: [{ type: 'section', text: { type: 'mrkdwn', text: 'Drawn' } }],
      assets: [],
    });

    const uploaded = runtime.surfaces.slack.renderNode(node, {
      collectAssets: true,
      text: 'A chart',
    });
    expect(uploaded.text).toBe('A chart');
    expect(uploaded.assets).toEqual([
      expect.objectContaining({ ref: 'asset-0', node }),
    ]);
    expect(uploaded.blocks).toEqual([
      expect.objectContaining({ type: 'image' }),
    ]);
  });

  it('allows a pack to declare slack without every primitive implementing it', () => {
    // Slack degrades through the markdown fallback, so declaring it is not a
    // promise that every primitive has a native renderer.
    expect(() =>
      definePrimitivePack({
        id: 'test.slack',
        surfaces: ['slack'],
        primitives: [notePrimitive, boldPrimitive],
      })
    ).not.toThrow();
  });
});
