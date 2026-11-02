import { defineStudioConfig } from '@elastic/isomer-studio';

import { slidesStudioConfig } from './packages/isomer-primitives-slides/isomer-studio.config';

export default defineStudioConfig({
  ...slidesStudioConfig,
  apps: [
    ...(slidesStudioConfig.apps ?? []),
    {
      id: 'lens',
      title: 'Lens inspector',
      description:
        'Inspect native ES|QL envelopes and replay responses locally; no query execution.',
      load: () => import('./packages/isomer-lowering-lens/studio/app'),
    },
    {
      id: 'metric',
      title: 'Metric / trend',
      description:
        'Portable metric fixtures and Elastic Charts browser rendering.',
      load: () =>
        import('./packages/isomer-renderers-elastic-charts/studio/app'),
    },
  ],
  images: false,
  imageFonts: './packages/isomer-primitives-slides/studio/image_fonts.ts',
});
