import { defineStudioConfig } from '@elastic/isomer-studio';

import { slidesStudioConfig } from './packages/isomer-primitives-slides/isomer-studio.config';

export default defineStudioConfig({
  ...slidesStudioConfig,
  images: false,
  imageFonts: './packages/isomer-primitives-slides/studio/image_fonts.ts',
});
