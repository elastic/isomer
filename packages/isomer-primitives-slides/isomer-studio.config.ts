/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import { adoptStylesheet, defineStudioConfig } from '@elastic/isomer-studio';

import { previewSlide } from './src/examples/preview_slide';
import { slideDeckFrame, slidesPack, slideStylesheet } from './src/index';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

// Built once. `adoptStylesheet` parses it once per document.
let stylesheet: string | undefined;

const { primitives: catalog, groups } = runtime.getAuthoringContext();
const [slideGroup] = groups;

export default defineStudioConfig({
  runtime,
  apps: [
    {
      id: 'slides',
      title: 'Slide viewer',
      load: () => import('./studio/slides_app'),
      pages: (slideGroup?.types ?? []).map((type) => ({
        path: type,
        title: catalog.find((entry) => entry.type === type)?.name ?? type,
        section: slideGroup?.title,
      })),
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
