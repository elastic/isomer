/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { toSlides } from './slides';

const frame = {
  type: 'slideFrame',
  body: [{ type: 'slideHeading', title: 'Refunds' }],
};
const composition: Composition = {
  type: 'view',
  title: 'Refunds',
  body: [frame],
};

describe('toSlides', () => {
  it('shows a slide the JSX printer refuses with the reason and its JSON', () => {
    const refused = {
      ...composition,
      body: 'unknownThing',
    } as unknown as Composition;
    const [slide] = toSlides({
      id: 'd',
      title: 'Deck',
      updatedAt: '',
      slides: [composition],
      stored: [refused],
    });
    const [jsx, json] = slide!.sources;
    expect(jsx!.text).toMatch(/^\/\/ /);
    expect(json!.text).toContain('unknownThing');
  });
});
