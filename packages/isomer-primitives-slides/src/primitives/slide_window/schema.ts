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
import { packWalk } from '../pack_walk';
import { findNode } from '../slide_render/embedded';

// An embedded slide is not a child slot, so a window in one is not nested here.
const findWindow = (body: unknown) =>
  findNode(body, packWalk, ({ type }) => type === 'slideWindow');

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
          'Slide nodes shown inside the window, top to bottom, e.g. a slideCode or slideBulletList. At least one; never another slideWindow.'
        ),
    })
    .strict()
    .check(
      crossRefine(({ body }) => findWindow(body).kind !== 'found', {
        error: 'a window cannot hold another window',
        path: ['body'],
        rule: 'At least one; never another slideWindow.',
      })
    );

/** Zod schema for {@link SlideWindowNode}. */
export const schema = buildSchema(unresolvedBodyNodeSchema);
