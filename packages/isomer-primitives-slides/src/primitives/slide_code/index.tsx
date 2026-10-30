/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import { definePrimitive } from '../define';

import { catalog } from './catalog';
import { examples } from './examples';
import { icon } from './icon';
import { panelsMarkdown, panelsSlack, panelsText } from './panels';
import { react } from './react';
import { schema, type SlideCodeNode } from './schema';
import { codeModule } from './styles';

export type { SlideCodeNode, SlideCodePanel } from './schema';

export const text = (node: SlideCodeNode): string => panelsText([node]);

export const markdown = (node: SlideCodeNode) => panelsMarkdown([node]);

export const slack = (node: SlideCodeNode): SlackBlock[] => panelsSlack([node]);

export const slideCodePrimitive = definePrimitive({
  type: 'slideCode',
  catalog,
  icon,
  examples,
  schema,
  styles: [codeModule],
  renderers: {
    react,
    text,
    markdown,
    slack,
  },
});
