/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { markdownTable } from '../../render/markdown';
import { stripMarks } from '../../render/marks';
import { textTable } from '../../render/table';
import { slideDistillery } from '../../theme/distillery';
import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { react } from './react';
import { schema, type SlideBarsNode } from './schema';
import { barValue } from './value';

export type { SlideBarsItem, SlideBarsNode } from './schema';

const { heads } = slideDistillery.tokens.bars;

const table = ({ items }: SlideBarsNode) => {
  const details = items.some(({ detail }) => detail);
  return {
    head: [
      heads.label.value,
      heads.value.value,
      ...(details ? [heads.detail.value] : []),
    ],
    body: items.map(({ label, value, detail }) => [
      label,
      barValue(value),
      ...(details ? [detail ?? ''] : []),
    ]),
  };
};

/** Text renderer for {@link SlideBarsNode}: a padded Label, Value, Detail table. */
export const text = (node: SlideBarsNode): string => {
  const { head, body } = table(node);
  return textTable(
    head,
    body.map((row) => row.map(stripMarks))
  );
};

/** Markdown renderer for {@link SlideBarsNode}: a pipe table, which Slack draws natively. */
export const markdown = (node: SlideBarsNode): string => {
  const { head, body } = table(node);
  return markdownTable(head, body);
};

/** Catalog, schema, and renderers for {@link SlideBarsNode}. */
export const slideBarsPrimitive = definePrimitive({
  type: 'slideBars',
  catalog,
  examples,
  schema,
  renderers: {
    react,
    text,
    markdown,
  },
});
