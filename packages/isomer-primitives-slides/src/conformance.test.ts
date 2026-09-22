/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';

import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  definePrimitive,
  definePrimitivePack,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import {
  CONFORMANCE_FOREIGN_MARKER,
  type PrimitiveConformanceHarness,
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
        markdown: (node) => node.text,
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
// non-frame nodes in one so renderSVGComposition can draw a valid slide.
const wrapInFrame = (node: PrimitiveNode): PrimitiveNode =>
  node.type === 'slideFrame'
    ? node
    : ({
        type: 'slideFrame',
        chapter: 'Conformance',
        footer: 'Conformance',
        body: [node],
      } as unknown as PrimitiveNode);

const harness: PrimitiveConformanceHarness = {
  sizesFromNodeHeights: false,
  wrapComposition: (node) => ({
    type: 'view',
    title: 'Conformance fixture',
    body: [wrapInFrame(node)],
  }),
  validateNode: (node) => {
    const result = runtime.validate({ type: 'view', body: [node] });
    return result.valid ? [] : result.errors;
  },
  validateComposition: (composition) => runtime.validate(composition),
  renderReact: (node) =>
    runtime.surfaces.react.render({ type: 'view', body: [node] }),
  collectStyles: (node) => {
    runtime.surfaces.react.render({ type: 'view', body: [node] });
  },
  renderText: (node) => runtime.surfaces.text.renderNode(node),
  renderMarkdown: (node) => runtime.surfaces.markdown.renderNode(node),
  renderSlack: (node) => runtime.surfaces.slack.renderNode(node).blocks,
  renderSvg: (node) => runtime.surfaces.svg.renderNode(node).element,
  estimateSvgHeight: () => 0,
  nestForeignChild: (container) => {
    if (container.type === 'slideSplit') {
      return {
        ...container,
        left: [conformanceForeignNode],
        right: [conformanceForeignNode],
      } as unknown as PrimitiveNode;
    }
    if (container.type === 'slideStack') {
      return {
        ...container,
        items: [conformanceForeignNode],
      } as unknown as PrimitiveNode;
    }
    return {
      ...container,
      body: [conformanceForeignNode],
    } as unknown as PrimitiveNode;
  },
  renderHTML: (composition) => runtime.surfaces.html.render(composition),
  assertVarRefsHaveDeclarations: (css) => {
    const missing = varRefs(css).filter(
      (name) => !new RegExp(`${name}\\s*:`).test(css)
    );
    assert.deepEqual(missing, [], `undeclared css vars: ${missing.join(', ')}`);
  },
  renderTextComposition: (composition) =>
    runtime.surfaces.text.render(composition),
  renderMarkdownComposition: (composition) =>
    runtime.surfaces.markdown.render(composition),
  renderSlackComposition: (composition) => {
    const result = runtime.surfaces.slack.render(composition);
    return {
      blocks: result.blocks,
      text: result.text,
    };
  },
  renderSVGComposition: (composition) => {
    const validation = runtime.validate(composition);
    const { element, css } = runtime.surfaces.svg.render(composition);
    const svg = `<style>${css}</style>${renderToStaticMarkup(element)}`;
    return Promise.resolve({
      validationErrors: validation.errors,
      svg,
      measurement: { total: Buffer.byteLength(svg, 'utf8') },
    });
  },
};

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
