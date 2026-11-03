/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import {
  definePrimitive,
  definePrimitivePack,
  type Frame,
  nodeAnchor,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import {
  CONFORMANCE_FIXTURE_TITLE,
  primitiveConformanceRows,
  runPrimitiveInventoryConformance,
} from '@elastic/isomer-sdk/testing';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { createIsomerRuntime } from '../assemble';

import { createRuntimeConformanceHarness } from './conformance_harness';

interface NoteNode extends PrimitiveNode {
  type: 'note';
  text: string;
}

const note: NoteNode = { type: 'note', text: 'Hello' };

const notePrimitive = definePrimitive<NoteNode>({
  type: 'note',
  catalog: {
    type: 'note',
    purpose: 'Render a compact note.',
    useWhen: ['A runtime needs a minimal text node.'],
    avoidWhen: ['The official primitive pack is available.'],
    example: note,
  },
  examples: [note],
  schema: z.object({ type: z.literal('note'), text: z.string().min(1) }),
  renderers: {
    react: (node, { context }) =>
      createElement('span', nodeAnchor(context, node), node.text),
    text: (node) => node.text,
    markdown: (node) => md.paragraph(node.text),
    slack: (node): SlackBlock => ({
      type: 'section',
      text: { type: 'mrkdwn', text: node.text },
    }),
  },
});

const pack = definePrimitivePack<string>({
  id: 'conformance-harness-test',
  primitives: [notePrimitive],
});

const frame: Frame<string> = {
  defaultWidth: 600,
  theme: { light: 'light-theme', dark: 'dark-theme' },
  estimateHeight: () => 100,
  wrap: (_spec, body, viewport) =>
    createElement('div', { style: { width: viewport.width } }, body),
};

const plain = createIsomerRuntime({ packs: [pack] });
const framed = createIsomerRuntime({ packs: [pack], frames: { card: frame } });

describe('createRuntimeConformanceHarness', () => {
  it('derives every member a runtime without a frame can answer', () => {
    const harness = createRuntimeConformanceHarness(plain);

    expect(harness).not.toHaveProperty('renderSnapshotNode');
    expect(harness).not.toHaveProperty('renderSnapshotComposition');
    expect(harness).toHaveProperty('renderHTML');
    expect(harness).toHaveProperty('anchorWalk');
  });

  it('derives the snapshot members when the runtime has a frame', () => {
    const harness = createRuntimeConformanceHarness(framed);

    expect(harness).toHaveProperty('renderSnapshotNode');
    expect(harness).toHaveProperty('renderSnapshotComposition');
  });

  it('wraps a node in a view titled with the fixture title', () => {
    const harness = createRuntimeConformanceHarness(plain);

    expect(harness.wrapComposition(note)).toEqual({
      type: 'view',
      title: CONFORMANCE_FIXTURE_TITLE,
      body: [note],
    });
  });

  it('reports the errors of an invalid node', () => {
    const harness = createRuntimeConformanceHarness(plain);

    expect(harness.validateNode(note)).toEqual([]);
    const empty: NoteNode = { type: 'note', text: '' };
    expect(harness.validateNode(empty)).not.toEqual([]);
  });

  it('lets overrides replace a derived member and add one', () => {
    const wrapComposition = () => ({ type: 'view' as const, body: [] });
    const harness = createRuntimeConformanceHarness(plain, {
      wrapComposition,
      sizesFromNodeHeights: false,
    });

    expect(harness).toMatchObject({
      wrapComposition,
      sizesFromNodeHeights: false,
    });
    expect(harness).toHaveProperty('renderText');
  });

  it('forwards the css option to the HTML surface', () => {
    const styled = createIsomerRuntime({
      packs: [pack],
      styleAdapter: {
        createCollector: () => ({ css: '.note { color: red; }' }),
        createRenderContext: () => ({}),
        renderStyles: (collector: { css: string }) => collector.css,
      },
    });
    const harness = createRuntimeConformanceHarness(styled);
    const composition = harness.wrapComposition(note);

    const inline = harness.renderHTML?.(composition);
    expect(inline?.html).toContain('<style');
    expect(inline?.html).toContain('.note { color: red; }');

    const separate = harness.renderHTML?.(composition, { css: 'separate' });
    expect(separate?.html).not.toContain('<style');
    expect(separate?.css).toContain('.note { color: red; }');
  });

  it('measures a snapshot composition as the bytes of its stylesheet and markup', async () => {
    const harness = createRuntimeConformanceHarness(framed);
    const result = await harness.renderSnapshotComposition?.(
      harness.wrapComposition(note)
    );

    expect(result?.validationErrors).toEqual([]);
    expect(result?.html).toContain('Hello');
    expect(result?.measurement.total).toBe(
      new TextEncoder().encode(result?.html).length
    );
  });
});

describe.each([
  ['without a frame', plain],
  ['with a frame', framed],
])('conformance %s', (_name, runtime) => {
  const harness = createRuntimeConformanceHarness(runtime);

  it('passes inventory conformance', () => {
    runPrimitiveInventoryConformance(runtime.primitives);
  });

  it.each(primitiveConformanceRows(runtime.primitives))(
    '$type #$exampleIndex: $name',
    async (row) => {
      await row.run(row, harness);
    }
  );
});
