/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { definePrimitive } from '../define';
import { panelsMarkdown, panelsSlack, panelsText } from '../slide_code/panels';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { react } from './react';
import { schema, type SlideCodeTraceNode } from './schema';

export type { SlideCodeTraceNode } from './schema';

export const text = ({ panels }: SlideCodeTraceNode): string =>
  panelsText(panels);

export const markdown = ({ panels }: SlideCodeTraceNode) =>
  panelsMarkdown(panels);

export const slack = ({ panels }: SlideCodeTraceNode): SlackBlock[] =>
  panelsSlack(panels);

export const slideCodeTracePrimitive = definePrimitive({
  type: 'slideCodeTrace',
  catalog,
  icon,
  examples,
  schema,
  styles: [],
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
