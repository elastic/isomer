/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import { adoptStylesheet, defineStudioConfig } from '@elastic/isomer-studio';

import { deckCatalog } from './decks/catalog';
import { previewSlide } from './src/examples/preview_slide';
import { slideDeckFrame, slidesPack, slideStylesheet } from './src/index';
import { decksIcon } from './studio/decks_icon';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

// Built once. `adoptStylesheet` parses it once per document.
let stylesheet: string | undefined;

export default defineStudioConfig({
  runtime,
  imageFonts: './studio/image_fonts.ts',
  // One of each kind, so Home shows the pack's range at a glance.
  featured: [
    'titleSlide',
    'slideBulletList',
    'slideSplitLayout',
    'slidePipeline',
    'slideCode',
    'quoteSlide',
  ],
  apps: [
    {
      id: 'decks',
      title: 'Decks',
      description:
        'Whole presentations built from the slides pack, played one slide at a time.',
      icon: decksIcon,
      load: () => import('./studio/decks_app'),
      pages: deckCatalog.map(({ id, title }) => ({ path: id, title })),
    },
  ],
  createReactContext: (root) => {
    stylesheet ??= slideStylesheet();
    adoptStylesheet(root, stylesheet);
    return {};
  },
  compose: (nodes, { theme }): Composition => {
    const [only] = nodes;
    const preview: Composition =
      nodes.length === 1 && only
        ? previewSlide(only)
        : { type: 'view', body: [...nodes] };
    return { ...preview, theme };
  },
});
