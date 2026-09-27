/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Every idea on a slide lives in real nodes, so the degraded surfaces carry
// the same words as the image. Embedded renders restate another composition
// rather than their own fields, so they are checked by their own tests.

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from './pack';
import { slideDeckPrimitives } from './registry';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const exempt = new Set(['slideRender', 'slideRenderGrid']);

/** Keys whose values are identifiers, enums, or addresses rather than authored words. */
const notWords = new Set([
  'type',
  'id',
  'tone',
  'href',
  'hrefs',
  'url',
  'surface',
  'surfaces',
  'placement',
  'size',
  'chrome',
  'format',
  'role',
  'language',
  'ratio',
  'divider',
  'spacing',
  'marker',
  'edges',
  'marks',
  'op',
  'from',
  'to',
  'current',
  'highlight',
]);

const authoredStrings = (value: unknown, key = ''): string[] => {
  if (notWords.has(key)) {
    return [];
  }
  if (typeof value === 'string') {
    return value.trim() ? [value] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => authoredStrings(entry, key));
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([name, entry]) =>
      authoredStrings(entry, name)
    );
  }
  return [];
};

const stringLeaves = (value: unknown): string[] => {
  if (typeof value === 'string') {
    return [value];
  }
  if (typeof value === 'object' && value !== null) {
    return Object.values(value).flatMap(stringLeaves);
  }
  return [];
};

// Marks render differently per surface, so their markers are compared away.
const normalize = (text: string) =>
  text
    .replace(/\\([\\`*_{}[\]()#+\-.!|<>&=~])/g, '$1')
    .replace(/[`*]/g, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();

const surfaces = {
  text: (node: PrimitiveNode) => runtime.surfaces.text.renderNode(node),
  markdown: (node: PrimitiveNode) => runtime.surfaces.markdown.renderNode(node),
  slack: (node: PrimitiveNode) =>
    stringLeaves(runtime.surfaces.slack.renderNode(node).blocks).join('\n'),
};

const rows = slideDeckPrimitives
  .filter(({ type }) => !exempt.has(type))
  .flatMap(({ type, examples }) =>
    examples.map((example, index) => ({
      name: `${type}#${index}`,
      node: example,
    }))
  );

describe('content parity', () => {
  it.each(rows)('$name carries every authored string', ({ node }) => {
    const words = authoredStrings(node).flatMap((text) => text.split('\n'));
    for (const [surface, render] of Object.entries(surfaces)) {
      const output = normalize(render(node));
      const missing = words.filter(
        (word) => word.trim() && !output.includes(normalize(word.trim()))
      );
      expect(missing, surface).toEqual([]);
    }
  });
});
