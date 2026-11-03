/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { defineStudioConfig } from '@elastic/isomer-studio';

import { slidesStudioConfig } from './packages/isomer-primitives-slides/isomer-studio.config';

/** The repository's Studio: every in-repo pack, drawn in the browser alone. */
export default defineStudioConfig({
  ...slidesStudioConfig,
  apps: [
    ...(slidesStudioConfig.apps ?? []),
    {
      id: 'lens',
      title: 'Lens inspector',
      description:
        'Plan a native ES|QL Lens saved object and replay a recorded response; nothing is fetched or executed.',
      load: () => import('./packages/isomer-lowering-lens/studio/app'),
    },
  ],
  images: false,
  imageFonts: './packages/isomer-primitives-slides/studio/image_fonts.ts',
});
