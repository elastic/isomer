/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import type { SlideGroup } from '../../groups';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideDiffNode}. */
export const catalog = {
  type: 'slideDiff',
  name: 'Diff',
  group: 'Code',
  description:
    'One snippet with changed lines marked. Each entry in lines is one line of source, with no newline.',
  purpose:
    'Show the reader exactly what a change did to a piece of source: which lines it added, which it removed, and what stayed.',
  useWhen: [
    'The point of the slide is a before and after of the same snippet, such as a fix, a refactor, or a config change.',
    'A few changed lines need their surrounding context to make sense.',
  ],
  avoidWhen: [
    'Nothing changed and you are showing code as it is; use slideCode.',
    'You are comparing two ideas or approaches rather than two versions of one file; use slideSplit.',
  ],
  example,
} satisfies PrimitiveCatalogEntry<SlideGroup>;
