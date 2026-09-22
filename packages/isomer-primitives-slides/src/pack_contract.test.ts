/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bindFrame,
  createPrimitiveDispatcher,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { SLIDE_HEIGHT, SLIDE_WIDTH, slideDeckFrame } from './pack';
import { slideDeckPrimitives, slidePrimitiveTypes } from './registry';

// Use a dispatcher for renders that require scope (containers thread it).
const dispatcher = createPrimitiveDispatcher(slideDeckPrimitives, {
  label: 'pack-contract',
});

describe('slide pack contract', () => {
  // Counting and uniqueness live in `registry.test.ts`, beside the directory
  // check that makes them meaningful.
  it('registers the frame the document contract requires', () => {
    expect(slidePrimitiveTypes).toContain('slideFrame');
  });

  it('gives every primitive all three mandatory renderers', () => {
    for (const primitive of slideDeckPrimitives) {
      const { renderers, type } = primitive;
      for (const surface of ['react', 'text', 'markdown'] as const) {
        expect(typeof renderers[surface], `${type}.${surface}`).toBe(
          'function'
        );
      }
    }
  });

  it('gives every primitive at least one example that validates', () => {
    for (const primitive of slideDeckPrimitives) {
      expect(primitive.examples.length, primitive.type).toBeGreaterThan(0);
      for (const [index, example] of primitive.examples.entries()) {
        const result = primitive.schema.safeParse(example);
        expect(result.success, `${primitive.type}:${index}`).toBe(true);
      }
    }
  });

  it('renders every example to non-empty text and markdown', () => {
    for (const primitive of slideDeckPrimitives) {
      for (const [index, example] of primitive.examples.entries()) {
        const label = `${primitive.type}:${index}`;
        const node = example as PrimitiveNode;
        expect(dispatcher.renderText(node).trim(), label).not.toBe('');
        expect(dispatcher.renderMarkdown(node).trim(), label).not.toBe('');
      }
    }
  });
});

describe('slide frame', () => {
  const frame = {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    mode: undefined,
  };
  const slideFrameExample = slideDeckPrimitives.find(
    (definition) => definition.type === 'slideFrame'
  )!.examples[0]! as PrimitiveNode;
  const dispatcher = {
    renderSvg: (node: PrimitiveNode) => `<${node.type}>`,
    estimateSvgHeight: () => 0,
  };
  const bound = bindFrame(slideDeckFrame);

  it('renders a single-root spec', () => {
    const spec = { type: 'view' as const, body: [slideFrameExample] };
    expect(bound.render(spec, frame, dispatcher)).toBe(
      `<${slideFrameExample.type}>`
    );
  });

  it('reports a body it would have to silently truncate', () => {
    expect(
      slideDeckFrame.validateBody?.([slideFrameExample, slideFrameExample])
    ).toEqual([expect.stringMatching(/exactly one "slideFrame" node, got 2/)]);
  });

  it('reports a bare content node as the root', () => {
    const content = slideDeckPrimitives.find(
      (definition) => definition.type === 'slideTitle'
    )!.examples[0]! as PrimitiveNode;
    expect(slideDeckFrame.validateBody?.([content])).toEqual([
      expect.stringMatching(/needs a "slideFrame" root, got "slideTitle"/),
    ]);
  });

  it('keeps the one-slide rule when a host replaces the wrap', () => {
    const branded = { ...slideDeckFrame, wrap: () => '<brand/>' };
    expect(
      branded.validateBody?.([slideFrameExample, slideFrameExample])
    ).toEqual([expect.stringMatching(/exactly one "slideFrame" node, got 2/)]);
  });
});
