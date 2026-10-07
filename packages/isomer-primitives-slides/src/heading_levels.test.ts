/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  exampleNodes,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import type { Nodes } from 'mdast';
import { fromMarkdown } from 'mdast-util-from-markdown';
import { gfmFromMarkdown } from 'mdast-util-gfm';
import { gfm } from 'micromark-extension-gfm';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from './pack';
import { slideDeckPrimitives } from './registry';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const onSlide = (node: PrimitiveNode): Composition => ({
  type: 'view',
  title: 'Composition title',
  body: [
    node.type === 'slideFrame'
      ? node
      : ({ type: 'slideFrame', body: [node] } as PrimitiveNode),
  ],
});

const htmlLevels = (html: string): number[] =>
  [...html.matchAll(/<h([1-6])[\s>]/g)].map(([, level]) => Number(level));

const depths = (node: Nodes): number[] => [
  ...(node.type === 'heading' ? [node.depth] : []),
  ...('children' in node ? node.children.flatMap(depths) : []),
];

const markdownLevels = (markdown: string): number[] =>
  depths(
    fromMarkdown(markdown, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    })
  );

// Each drawn tile repeats the embedded slide's outline, which Markdown quotes once.
const repeatsOutline = new Set(['slideRenderGrid']);

const rows = slideDeckPrimitives
  .filter(({ type }) => !repeatsOutline.has(type))
  .flatMap(({ type, examples }) =>
    exampleNodes({ examples }).map((example, index) => ({
      name: `${type}#${index}`,
      composition: onSlide(example as PrimitiveNode),
    }))
  );

describe('heading levels', () => {
  it.each(rows)(
    '$name has the same outline in HTML and Markdown',
    ({ composition }) => {
      const html = runtime.surfaces.html.render(composition, {
        heading: false,
      }).html;
      const markdown = runtime.surfaces.markdown.render(composition, {
        heading: false,
      });
      expect(htmlLevels(html)).toEqual(markdownLevels(markdown));
    }
  );
});
