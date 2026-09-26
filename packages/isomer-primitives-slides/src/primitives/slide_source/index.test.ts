/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';

import { codeExample } from './examples';
import { markdown, text } from './index';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

describe('slideSource', () => {
  it('prefixes the line on every degraded surface', () => {
    expect(text(codeExample)).toMatchInlineSnapshot(
      `"Source · Nightly export of orders.csv, counted on 3 March"`
    );
    expect(markdown(codeExample)).toMatchInlineSnapshot(
      `"_Source · Nightly export of \`orders.csv\`, counted on 3 March_"`
    );
    expect(runtime.surfaces.slack.render(compose(codeExample)).blocks)
      .toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "text": "Source · Nightly export of \`orders.csv\`, counted on 3 March",
              "type": "mrkdwn",
            },
          ],
          "type": "context",
        },
      ]
    `);
  });
});
