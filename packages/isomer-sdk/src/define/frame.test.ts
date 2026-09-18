/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import type { PrimitiveNode } from '../composition/node';

import type { FrameDispatcher } from './frame';
import { bindFrame } from './frame';

interface Theme {
  ink: string;
}

const dispatcher: FrameDispatcher = {
  renderSvg: (node, key) => ({ node: node.type, key }) as unknown as ReactNode,
  estimateSvgHeight: () => 10,
};

const frame = bindFrame<Theme>({
  defaultWidth: 640,
  theme: {
    light: { ink: 'black' },
    dark: { ink: 'white' },
  },
  estimateHeight: () => 100,
  wrap: (_header, _body, viewport) => viewport.theme as unknown as ReactNode,
});

describe('bindFrame theme resolution', () => {
  const spec = {
    type: 'view' as const,
    body: [{ type: 'note' }] as PrimitiveNode[],
  };

  it('resolves dark mode to the dark palette', () => {
    expect(
      frame.render(spec, { width: 640, height: 100, mode: 'dark' }, dispatcher)
    ).toEqual({ ink: 'white' });
  });

  it('resolves light, auto, and omitted mode to the light palette', () => {
    expect(
      frame.render(spec, { width: 640, height: 100, mode: 'light' }, dispatcher)
    ).toEqual({ ink: 'black' });
    expect(
      frame.render(spec, { width: 640, height: 100, mode: 'auto' }, dispatcher)
    ).toEqual({ ink: 'black' });
    expect(
      frame.render(
        spec,
        { width: 640, height: 100, mode: undefined },
        dispatcher
      )
    ).toEqual({ ink: 'black' });
  });

  it('keys a lone node by its type', () => {
    expect(frame.renderNode({ type: 'note' }, dispatcher)).toEqual({
      node: 'note',
      key: 'note',
    });
  });
});
