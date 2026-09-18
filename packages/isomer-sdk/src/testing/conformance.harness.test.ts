/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import assert from 'node:assert/strict';

import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, it } from 'vitest';

import type { PrimitiveNode } from '../composition/node';
import { bindFrame, type Frame, type FrameDispatcher } from '../define/frame';
import { renderHTMLWithDispatcher } from '../render/html/envelope';
import { renderMarkdownEnvelope } from '../render/markdown/envelope';
import { createPrimitiveDispatcher } from '../render/primitive_dispatch';
import { renderSlackEnvelope } from '../render/slack/envelope';
import { renderTextEnvelope } from '../render/text/envelope';
import { createCompositionValidator } from '../validate/validation';

import {
  CONFORMANCE_FOREIGN_MARKER,
  type PrimitiveConformanceHarness,
  primitiveConformanceRows,
} from './conformance';
import {
  conformanceDefinitions,
  fixtureDefinitions,
  type InkPackTypes,
} from './sdk.fixtures';

// `fixtureDefinitions` (a different pack) is composed in only so the
// cross-pack nesting case below has a `note` node genuinely foreign to
// `conformanceDefinitions` to hand a container.
const dispatcher = createPrimitiveDispatcher<PrimitiveNode, InkPackTypes>(
  [...conformanceDefinitions, ...fixtureDefinitions],
  { label: 'conformance' }
);

const validate = createCompositionValidator(conformanceDefinitions);

const frame: Frame<{ ink: string }> = {
  defaultWidth: 600,
  theme: { light: { ink: '#000' }, dark: { ink: '#fff' } },
  estimateHeight: (composition, frameDispatcher) =>
    composition.body.reduce(
      (total, node) => total + frameDispatcher.estimateSvgHeight(node),
      16
    ),
  wrap: (header, body, viewport) =>
    createElement(
      'svg',
      {
        xmlns: 'http://www.w3.org/2000/svg',
        width: viewport.width,
        height: viewport.height,
      },
      createElement('title', null, header.title ?? 'conformance'),
      ...body
    ),
};

const bound = bindFrame(frame);

/** Binds the render context the `svg` surface would otherwise supply. */
const frameDispatcher: FrameDispatcher = {
  renderSvg: (node, key) => dispatcher.renderSvg(node, {}, undefined, key),
  estimateSvgHeight: (node) => dispatcher.estimateSvgHeight(node),
};

const varRefs = (css: string): string[] => [
  ...new Set([...css.matchAll(/var\((--[\w-]+)/g)].map((m) => m[1]!)),
];

const harness: PrimitiveConformanceHarness = {
  wrapComposition: (node) => ({
    type: 'view',
    title: 'Conformance fixture',
    body: [node],
  }),
  validateNode: (node) => {
    const result = validate({ type: 'view', body: [node] });
    return result.valid ? [] : result.errors;
  },
  validateComposition: (composition) => validate(composition),
  renderReact: (node) => dispatcher.renderReact(node),
  collectStyles: (node) => {
    dispatcher.renderReact(node);
  },
  renderText: (node) => dispatcher.renderText(node),
  renderMarkdown: (node) => dispatcher.renderMarkdown(node),
  renderSlack: (node) => dispatcher.renderSlack(node),
  renderSvg: (node, key) => dispatcher.renderSvg(node, {}, undefined, key),
  estimateSvgHeight: (node) => dispatcher.estimateSvgHeight(node),
  nestForeignChild: (container) =>
    ({
      ...container,
      items: [{ type: 'note', body: CONFORMANCE_FOREIGN_MARKER }],
    }) as unknown as PrimitiveNode,
  renderHTML: (composition) =>
    renderHTMLWithDispatcher(composition, { dispatcher, validate }),
  assertVarRefsHaveDeclarations: (css) => {
    const missing = varRefs(css).filter(
      (name) => !new RegExp(`${name}\\s*:`).test(css)
    );
    assert.deepEqual(missing, [], `undeclared css vars: ${missing.join(', ')}`);
  },
  renderTextComposition: (composition) =>
    renderTextEnvelope(composition, dispatcher),
  renderMarkdownComposition: (composition) =>
    renderMarkdownEnvelope(composition, dispatcher),
  renderSlackComposition: (composition) =>
    renderSlackEnvelope(composition, dispatcher),
  renderSVGComposition: (composition) => {
    const validation = validate(composition);
    const height = bound.estimateHeight(composition, frameDispatcher);
    const node: ReactNode = bound.render(
      composition,
      { width: bound.defaultWidth, height, mode: undefined },
      frameDispatcher
    );
    const svg = renderToStaticMarkup(node);
    return Promise.resolve({
      validationErrors: validation.errors,
      svg,
      measurement: { total: Buffer.byteLength(svg, 'utf8') },
    });
  },
};

const rows = primitiveConformanceRows(conformanceDefinitions);

describe('primitive conformance (sdk conformance pack)', () => {
  it.each(rows)('$type #$exampleIndex: $name', async (row) => {
    await row.run(row, harness);
  });
});
