/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bindFrame,
  createPrimitiveDispatcher,
  exampleNodes,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { assertPackIconsValid } from '@elastic/isomer-sdk/testing';
import { describe, expect, it } from 'vitest';

import { SLIDE_HEIGHT, SLIDE_WIDTH, slideDeckFrame, slidesPack } from './pack';
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
      for (const [index, example] of exampleNodes(primitive).entries()) {
        const result = primitive.schema.safeParse(example);
        expect(result.success, `${primitive.type}:${index}`).toBe(true);
      }
    }
  });

  it('renders every example to non-empty text and markdown', () => {
    for (const primitive of slideDeckPrimitives) {
      for (const [index, example] of exampleNodes(primitive).entries()) {
        const label = `${primitive.type}:${index}`;
        const node = example as PrimitiveNode;
        expect(dispatcher.renderText(node).trim(), label).not.toBe('');
        expect(dispatcher.renderMarkdown(node).trim(), label).not.toBe('');
      }
    }
  });
});

describe('slide pack icons', () => {
  it('declares icons that pass the icon rules', () => {
    expect(() => assertPackIconsValid(slidesPack)).not.toThrow();
  });

  it('exposes slideStat through pack.icons', () => {
    expect(slidesPack.icons['slideStat']?.svg).toBe(
      '<svg viewBox="0 0 16 16" fill="none" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">' +
        '<rect width="16" height="16" rx="3" fill="var(--isomer-icon-bg, #ebeefd)"/>' +
        '<rect x="3" y="3" width="3" height="10" rx=".5" fill="var(--isomer-icon-accent, #3d5ad8)"/>' +
        '<rect x="8" y="7" width="3" height="6" rx=".5" fill="var(--isomer-icon-muted, #b8c2f4)"/>' +
        '</svg>'
    );
  });
});

describe('slide frame', () => {
  const frame = {
    width: SLIDE_WIDTH,
    height: SLIDE_HEIGHT,
    mode: undefined,
  };
  const slideFrameExample = exampleNodes(
    slideDeckPrimitives.find((definition) => definition.type === 'slideFrame')!
  )[0]! as PrimitiveNode;
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
    const content = exampleNodes(
      slideDeckPrimitives.find(
        (definition) => definition.type === 'slideTitle'
      )!
    )[0]! as PrimitiveNode;
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
