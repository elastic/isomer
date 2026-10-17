/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { createRuntimeConformanceHarness } from '@elastic/isomer-runtime/testing';
import {
  definePrimitive,
  definePrimitivePack,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import {
  CONFORMANCE_FIXTURE_TITLE,
  CONFORMANCE_FOREIGN_MARKER,
  primitiveConformanceRows,
  runPrimitiveInventoryConformance,
} from '@elastic/isomer-sdk/testing';
import { describe, it } from 'vitest';
import { z } from 'zod';

import { slideDeckFrame, slidesPack } from './pack';
import { slideDeckPrimitives } from './registry';

// A trivial second pack, composed in only so the cross-pack nesting case can
// hand a slide container a child none of its own primitives register.
interface ConformanceForeignNode extends PrimitiveNode {
  type: 'conformanceForeign';
  text: string;
}

const conformanceForeignNode: ConformanceForeignNode = {
  type: 'conformanceForeign',
  text: CONFORMANCE_FOREIGN_MARKER,
};

const conformanceForeignPack = definePrimitivePack({
  id: 'conformance-foreign',
  primitives: [
    definePrimitive<ConformanceForeignNode>({
      type: 'conformanceForeign',
      catalog: {
        type: 'conformanceForeign',
        purpose: 'Conformance-only foreign leaf.',
        useWhen: [],
        avoidWhen: [],
        example: conformanceForeignNode,
      },
      examples: [conformanceForeignNode],
      schema: z.object({
        type: z.literal('conformanceForeign'),
        text: z.string(),
      }),
      renderers: {
        react: (node) => node.text,
        text: (node) => node.text,
        markdown: (node) => md.paragraph(node.text),
      },
    }),
  ],
});

const runtime = createIsomerRuntime({
  packs: [slidesPack, conformanceForeignPack],
  frames: { slide: slideDeckFrame },
});

const varRefs = (css: string): string[] => [
  ...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!)),
];

// `slideFrame` is required as the root of every slide composition. Wrap
// non-frame nodes in one so renderSnapshotComposition can draw a valid slide.
const wrapInFrame = (node: PrimitiveNode): PrimitiveNode =>
  node.type === 'slideFrame'
    ? node
    : ({
        type: 'slideFrame',
        footer: { section: 'Conformance', url: 'https://example.com' },
        body: [node],
      } as unknown as PrimitiveNode);

const nestForeignChild = (container: PrimitiveNode): PrimitiveNode => {
  if (container.type === 'slideSplitLayout') {
    const { panes } = container as unknown as {
      panes: Record<string, unknown>[];
    };
    return {
      ...container,
      panes: panes.map((pane) => ({
        ...pane,
        items: [conformanceForeignNode],
      })),
    } as unknown as PrimitiveNode;
  }
  if (container.type === 'titleSlide') {
    return {
      ...container,
      aside: conformanceForeignNode,
    } as unknown as PrimitiveNode;
  }
  if (container.type === 'slideAnnotatedRender') {
    return {
      ...container,
      render: conformanceForeignNode,
    } as unknown as PrimitiveNode;
  }
  if (container.type === 'slideStackLayout') {
    return {
      ...container,
      items: [conformanceForeignNode],
    } as unknown as PrimitiveNode;
  }
  return {
    ...container,
    body: [conformanceForeignNode],
  } as unknown as PrimitiveNode;
};

const harness = createRuntimeConformanceHarness(runtime, {
  sizesFromNodeHeights: false,
  wrapComposition: (node) => ({
    type: 'view',
    title: CONFORMANCE_FIXTURE_TITLE,
    body: [wrapInFrame(node)],
  }),
  estimateSnapshotHeight: () => 0,
  nestForeignChild,
  assertVarRefsHaveDeclarations: (css) => {
    const missing = varRefs(css).filter(
      (name) => !new RegExp(`${name}\\s*:`).test(css)
    );
    assert.deepEqual(missing, [], `undeclared css vars: ${missing.join(', ')}`);
  },
});

describe('slide pack inventory', () => {
  it('passes inventory conformance', () => {
    runPrimitiveInventoryConformance(slideDeckPrimitives);
  });
});

const rows = primitiveConformanceRows(slideDeckPrimitives);

describe('slide pack conformance', () => {
  it.each(rows)('$type #$exampleIndex: $name', async (row) => {
    await row.run(row, harness);
  });
});
