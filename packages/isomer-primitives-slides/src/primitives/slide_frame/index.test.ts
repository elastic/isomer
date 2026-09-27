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
import { example as titleExample } from '../slide_title/examples';

import type { SlideFrameNode } from './types';
import { sanitizeFrameUrl } from './url';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const footer = (frame: Omit<SlideFrameNode, 'type' | 'body'>): string => {
  const composition: Composition = {
    type: 'view',
    body: [
      { type: 'slideFrame', ...frame, body: [titleExample] } as PrimitiveNode,
    ],
  };
  const { html } = runtime.surfaces.html.render(composition);
  return /<footer[\s\S]*?<\/footer>/.exec(html)?.[0] ?? '';
};

describe('slideFrame footer', () => {
  it('draws the mark beside the footer of a frame with no section', () => {
    expect(footer({ tone: 'inverse', brand: 'Ledger' })).toContain('<svg');
  });

  it('draws the mark beside a section footer too', () => {
    expect(
      footer({ brand: 'Ledger', section: 'Settlement', sectionNumber: '02' })
    ).toContain('<svg');
  });

  it('leaves the mark out with logo: false', () => {
    expect(
      footer({ tone: 'inverse', brand: 'Ledger', logo: false })
    ).not.toContain('<svg');
  });
});

describe('slideFrame url', () => {
  it.each([
    'https://?',
    'https://#',
    'https://:',
    'http://',
    'ftp://host.example',
  ])('rejects %s, which has no web host', (url) => {
    expect(sanitizeFrameUrl(url)).toBeNull();
  });

  it.each([
    'https://example.com',
    'http://example.com:8080/a?b#c',
    'https://elastic.github.io/isomer',
  ])('accepts %s', (url) => {
    expect(sanitizeFrameUrl(url)).toBe(url);
  });
});
