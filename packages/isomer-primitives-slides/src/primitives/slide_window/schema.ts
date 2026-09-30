/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { unresolvedBodyNodeSchema, z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

import { slideWindowChromes } from '../../theme/variants';
import { lineText } from '../authored_text';
import { crossRefine } from '../cross_field';
import {
  EMBEDDING_TYPES,
  findInTree,
  TREE_WALK_MAX_DEPTH,
  TREE_WALK_MAX_VALUES,
  treeLimitMessage,
  treeLimitRule,
} from '../slide_render/embedded';

// A window inside an embedded slide sits in another slide, so embedded bodies are skipped.
const findWindow = (body: unknown) =>
  findInTree(
    body,
    ({ type }) => type === 'slideWindow',
    ({ type }, key) =>
      key === 'body' && typeof type === 'string' && EMBEDDING_TYPES.has(type)
  );

/** Shared by `schema` and `schemaFor`. */
export const buildSchema = (nodeSchema: ZodType<unknown>) =>
  z
    .object({
      type: z.literal('slideWindow'),
      chrome: z
        .enum(slideWindowChromes)
        .describe(
          'The app the content appears in: `browser`, `terminal`, `slack`, or `chat`. Only the title bar changes; `slack` shows the title as a channel.'
        ),
      title: lineText().describe(
        'Title bar text: a URL, a command, a thread name, or for `slack` the channel name without `#`.'
      ),
      body: z
        .array(nodeSchema)
        .min(1)
        .describe(
          `Slide nodes shown inside the window, top to bottom, e.g. a slideCode or slideBulletList. At least one; never another slideWindow. ${treeLimitRule}`
        ),
    })
    .strict()
    .check(
      crossRefine(({ body }) => findWindow(body).kind !== 'found', {
        error: 'a window cannot hold another window',
        path: ['body'],
        rule: 'At least one; never another slideWindow.',
      })
    )
    .check(
      crossRefine(({ body }) => !treeLimitMessage(findWindow(body)), {
        error: `a window body cannot be checked past ${TREE_WALK_MAX_DEPTH} levels or ${TREE_WALK_MAX_VALUES} values`,
        path: ['body'],
        rule: treeLimitRule,
      })
    );

/** Zod schema for {@link SlideWindowNode}. */
export const schema = buildSchema(unresolvedBodyNodeSchema);
