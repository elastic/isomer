/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideFrame,
  SlideHeading,
  SlideTable,
  toComposition,
} from '../shim';

export const packagesSlide = toComposition(
  <Slide title="Four packages publish; two stay in the repo">
    <SlideFrame {...frame} sectionNumber="05" section="Getting started">
      <SlideHeading title="Four packages publish; two stay in the repo" />
      <SlideTable
        columns={['Package', 'Role', 'Use']}
        rowHeaders={true}
        groups={[
          {
            label: 'A host installs',
            rows: [
              [
                '@elastic/isomer-sdk',
                'Contracts',
                'Write primitives and packs',
              ],
              ['@elastic/isomer-runtime', 'Assembly', 'Validate and render'],
            ],
          },
          {
            label: 'Added as needed',
            rows: [
              [
                '@elastic/isomer-primitives-slides',
                'Reference pack',
                'In the repo: copy it',
              ],
              [
                '@elastic/isomer-image-takumi',
                'Rasterizer',
                'Turn the svg surface into PNG',
              ],
              [
                '@elastic/isomer-agent-tools',
                'Agent tools',
                'In the repo: tools for any agent',
              ],
              [
                '@elastic/isomer-evals',
                'Harness',
                'Measure a model against a pack',
              ],
            ],
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
