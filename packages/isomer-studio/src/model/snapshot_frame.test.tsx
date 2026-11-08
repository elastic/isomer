/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type {
  Composition,
  Frame,
  StyledRenderContext,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import type { StudioConfig } from '../config';
import { type CalloutNode, componentsPack } from '../fixtures/components_pack';

import { withSnapshotFrame } from './snapshot_frame';

/** A frame that draws only `accepts` nodes. */
const frameOf = (defaultWidth: number, accepts: string): Frame<unknown> => ({
  defaultWidth,
  theme: { light: undefined, dark: undefined },
  estimateHeight: () => 100,
  validateBody: (body) =>
    body
      .filter(({ type }) => type !== accepts)
      .map(({ type }) => `draws no ${type}`),
  wrap: (_header, body) => <div>{body}</div>,
});

const runtime = createIsomerRuntime<unknown, StyledRenderContext, unknown>({
  packs: [componentsPack],
  frames: { card: frameOf(320, 'callout'), wide: frameOf(640, 'divider') },
  defaultFrame: 'card',
});

const divider: Composition = { type: 'view', body: [{ type: 'divider' }] };
const calloutNode: CalloutNode = {
  type: 'callout',
  title: 'Heads up',
  body: 'Check this.',
};
const callout: Composition = { type: 'view', body: [calloutNode] };

const wideDividers = withSnapshotFrame({
  runtime,
  snapshotFrame: ({ body }) =>
    body.every(({ type }) => type === 'divider') ? 'wide' : undefined,
});

const widthOf = (config: StudioConfig, composition: Composition) =>
  config.runtime.surfaces.snapshot?.render(composition).width;

describe('withSnapshotFrame', () => {
  it('leaves a config without snapshotFrame as it is', () => {
    const config: StudioConfig = { runtime };
    expect(withSnapshotFrame(config)).toBe(config);
  });

  it('draws each composition in the frame snapshotFrame names, else the default', () => {
    expect(widthOf(wideDividers, divider)).toBe(640);
    expect(widthOf(wideDividers, callout)).toBe(320);
  });

  it('lets a frame the caller passes win', () => {
    expect(() =>
      wideDividers.runtime.surfaces.snapshot?.render(divider, { frame: 'card' })
    ).toThrow(/frame "card" cannot draw/);
  });

  it('draws every page in the frame the first composition names', () => {
    const { snapshot } = wideDividers.runtime.surfaces;
    expect(snapshot?.renderPages([divider, divider]).width).toBe(640);
    expect(() => snapshot?.renderPages([divider, callout])).toThrow(
      /frame "wide" cannot draw page 2/
    );
  });
});
