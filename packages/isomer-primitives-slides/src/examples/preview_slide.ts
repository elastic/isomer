/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';

const inverseTypes = new Set(['slideSection', 'slideTitle', 'slideClosing']);
/** Page-tone openers that fill the slide without a heading. */
const openerTypes = new Set(['slideStatement', 'slideQuote']);

/** `node` as a deck slide: under a heading and lede, or alone on the tone its kind takes. */
export const previewSlide = (node: PrimitiveNode): Composition => ({
  type: 'view',
  title: node.type,
  body: [
    node.type === 'slideFrame'
      ? node
      : ({
          type: 'slideFrame',
          brand: 'Isomer',
          chapter: 'Preview',
          chapterNumber: '01',
          url: 'https://elastic.github.io/isomer',
          tone: inverseTypes.has(node.type) ? 'inverse' : 'page',
          body:
            inverseTypes.has(node.type) || openerTypes.has(node.type)
              ? [node]
              : [
                  {
                    type: 'slideHeading',
                    title: `Preview of ${node.type}`,
                    lede: 'A heading gives the primitive its real place in the frame.',
                  },
                  node,
                ],
        } as PrimitiveNode),
  ],
});
