/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { type Composition, createChildNodeWalker } from '@elastic/isomer-sdk';
import {
  CONFORMANCE_FIXTURE_TITLE,
  type PrimitiveConformanceHarness,
} from '@elastic/isomer-sdk/testing';

import type { IsomerRuntime } from '../assemble';

/** Renders nodes validation rejects, so a failing example surfaces as an assertion rather than a throw. */
const collect = { onValidationError: 'collect' } as const;

const utf8Bytes = (text: string): number =>
  new TextEncoder().encode(text).length;

/**
 * Derives every {@link PrimitiveConformanceHarness} member `runtime` can
 * answer. The `snapshot` members are present only when the runtime has a
 * frame. `overrides` replace derived members and add what a runtime cannot
 * know: `nestForeignChild`, `sizesFromNodeHeights`, `estimateSnapshotHeight`,
 * `assertVarRefsHaveDeclarations`, or a `wrapComposition` that frames its node.
 *
 * `renderHTML` forwards `css` and `anchors` but not `names`, which no runtime
 * option carries.
 */
export const createRuntimeConformanceHarness = (
  runtime: IsomerRuntime,
  overrides: Partial<PrimitiveConformanceHarness> = {}
): PrimitiveConformanceHarness => {
  const { surfaces, primitives } = runtime;
  const { html, markdown, react, slack, snapshot, text } = surfaces;
  const harness: PrimitiveConformanceHarness = {
    wrapComposition: (node) => ({
      type: 'view',
      title: CONFORMANCE_FIXTURE_TITLE,
      body: [node],
    }),
    validateNode: (node) =>
      runtime.validate({ type: 'view', body: [node] }).errors,
    validateComposition: (composition) => runtime.validate(composition),
    renderReact: (node) => renderToStaticMarkup(react.renderNode(node)),
    collectStyles: (node) => {
      html.renderNode(node, collect);
    },
    renderText: (node) => text.renderNode(node, collect),
    renderMarkdown: (node) => markdown.renderNode(node, collect),
    renderSlack: (node) => slack.renderNode(node, collect).blocks,
    renderHTML: (composition, options = {}) => {
      const { anchors, css } = options;
      return html.render(composition, {
        ...(anchors === undefined ? {} : { anchors }),
        ...(css === undefined ? {} : { css }),
      });
    },
    anchorWalk: createChildNodeWalker(primitives),
    renderTextComposition: (composition) => text.render(composition),
    renderMarkdownComposition: (composition) => markdown.render(composition),
    renderSlackComposition: (composition) => {
      const { blocks, text: fallback } = slack.render(composition);
      return { blocks, text: fallback };
    },
    ...(snapshot === undefined
      ? {}
      : {
          renderSnapshot: (node) => snapshot.renderNode(node, collect).element,
          renderSnapshotComposition: (composition: Composition) => {
            const { errors } = runtime.validate(composition);
            const { html: markup, css } = snapshot.render(composition, collect);
            const document = `<style>${css}</style>${markup}`;
            return Promise.resolve({
              validationErrors: errors,
              html: document,
              measurement: { total: utf8Bytes(document) },
            });
          },
        }),
  };
  return { ...harness, ...overrides };
};
