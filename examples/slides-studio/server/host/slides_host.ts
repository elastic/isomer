/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createIsomerPrompts,
  createIsomerResources,
  createIsomerTools,
  type IsomerPrompt,
  type IsomerResource,
  type IsomerTool,
  type IsomerToolsBaseOptions,
} from '@elastic/isomer-agent-tools';
import {
  slideDeckFrame,
  slidesAuthoringGuide,
  slidesAuthoringRules,
} from '@elastic/isomer-primitives-slides';

import { createDeckTools, type DeckToolsOptions } from './deck_tools';

const instructions =
  'You write slide decks the user watches in the Isomer studio. Read isomer_authoring_guide once, look up the primitives you pick with isomer_describe_primitives (slideFrame included), create a deck with deck_create, then write each slide with deck_set_slide in order. After writing a slide, look at it with deck_render_slide and fix anything crowded or overflowing; each render returns a PNG of up to about 120,000 characters, so render once per change rather than per word. Render a section divider again once its section is written, since its links are checked against the slides that exist. Tell the user the viewer URL deck_create returns: it shows every slide as you write it.';

/** What this host adds to the pack's guide: how its viewer addresses a slide. */
const studioGuide =
  'In this studio, the viewer at `/decks/<id>/present` opens a slide at `?slide=<n>`, counting from 0 with the title slide as 0. A `slideSection` `hrefs` entry is that relative link, e.g. `?slide=2`, one per `contents` line.';

/** What an agent gets from the studio, for any transport. */
export interface SlidesHost {
  instructions: string;
  tools: IsomerTool[];
  resources: IsomerResource[];
  prompts: IsomerPrompt[];
}

/** The slides pack's agent tools, resources, and prompt, plus the deck tools over `store`. */
export const createSlidesHost = (options: DeckToolsOptions): SlidesHost => {
  const { runtime, png } = options;
  const isomer: IsomerToolsBaseOptions = {
    runtime,
    guide: `${slidesAuthoringGuide}\n\n${studioGuide}`,
    rules: slidesAuthoringRules,
    frame: slideDeckFrame,
    heading: false,
    image: (composition, { theme }) =>
      png(composition, theme === 'dark' ? 'dark' : 'light'),
  };
  return {
    instructions,
    tools: [...createIsomerTools(isomer), ...createDeckTools(options)],
    resources: createIsomerResources(isomer),
    prompts: createIsomerPrompts(isomer),
  };
};
