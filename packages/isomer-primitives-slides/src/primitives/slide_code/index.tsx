/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideCodeNode } from './schema';

export type { SlideCodeNode } from './schema';

/** Text renderer for {@link SlideCodeNode}. */
export const text = (node: SlideCodeNode) =>
  [node.label, node.code].filter(Boolean).join('\n');

// A fence-info string only allows word-ish tokens; anything else would
// terminate the fence early or inject markdown.
const fenceInfoLanguage = (language: string | undefined): string =>
  language && /^[\w+#.-]+$/.test(language) ? language : 'text';

// The fence must be longer than any backtick run in the body, or the body
// closes it early.
const fenceFor = (code: string): string => {
  const longestRun = Math.max(
    2,
    ...(code.match(/`+/g) ?? []).map((run) => run.length)
  );
  return '`'.repeat(longestRun + 1);
};

/** Markdown renderer for {@link SlideCodeNode}. */
export const markdown = (node: SlideCodeNode) => {
  const fence = fenceFor(node.code);
  return [
    node.label ? `### ${node.label}` : '',
    `${fence}${fenceInfoLanguage(node.language)}\n${node.code}\n${fence}`,
  ]
    .filter(Boolean)
    .join('\n\n');
};

/** Catalog, schema, and renderers for {@link SlideCodeNode}. */
export const slideCodePrimitive = definePrimitive({
  type: 'slideCode',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
