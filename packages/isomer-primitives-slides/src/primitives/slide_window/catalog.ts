/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveCatalogEntry } from '@elastic/isomer-sdk';

import { example } from './examples';

/** Agent-facing catalog entry for {@link SlideWindowNode}. */
export const catalog = {
  type: 'slideWindow',
  purpose:
    'Show the reader where something appears, such as a terminal, a browser tab, a chat, or a Slack channel, by framing slide content in that app’s title bar.',
  useWhen: [
    'The place matters: output printed in a terminal, a message posted to a channel, a page at a URL.',
    'Two windows side by side in a slideSplit compare how the same thing looks in two apps.',
  ],
  avoidWhen: [
    'The content is not tied to an app; show it directly with slideCode, slideTable, or slideTranscript.',
    'The window would hold another window; put the two side by side with slideSplit.',
    'You want a real render of a slide on a surface; use slideRender.',
  ],
  example,
} satisfies PrimitiveCatalogEntry;
