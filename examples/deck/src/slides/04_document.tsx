/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  frame,
  Slide,
  SlideCode,
  SlideFrame,
  SlideHeading,
  SlideList,
  SlideRender,
  SlideSplit,
  toComposition,
} from '../shim';

export const documentSlide = toComposition(
  <Slide title="One typed document holds the shared part">
    <SlideFrame {...frame} sectionNumber="01" section="The problem">
      <SlideHeading
        title="One typed document holds the shared part"
        lede="The title slide’s composition, abridged, beside what the svg surface drew from it."
      />
      <SlideSplit
        ratio="wideLeft"
        divider="arrow"
        left={{
          items: [
            <SlideCode
              panels={[
                {
                  file: 'The title slide, as a composition',
                  lines: [
                    '{',
                    '  "type": "view",',
                    '  "title": "Isomer",',
                    '  "body": [{',
                    '    "type": "slideFrame",',
                    '    "tone": "inverse",',
                    '    "body": [{',
                    '      "type": "slideTitle",',
                    '      "title": "Isomer",',
                    '      "tagline": "One composition. Every surface."',
                    '    }]',
                    '  }]',
                    '}',
                  ],
                  highlightLines: [8],
                },
              ]}
            />,
          ],
        }}
        right={{
          items: [
            <SlideRender
              slide="title"

              surface="svg"
              caption="The same slide, from the svg surface"
            />,
            <SlideList
              items={[
                { body: 'Validated against the primitives a runtime holds' },
                { body: 'Rendered by every surface from the same value' },
                { body: 'Plain JSON, so a model can write one' },
              ]}
            />,
          ],
        }}
      />
    </SlideFrame>
  </Slide>
);
