/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideAuthoringNotes } from './authoring_notes';

const slide = (
  body: { type: string }[],
  tone?: 'page' | 'inverse'
): Composition =>
  ({
    type: 'view',
    body: [{ type: 'slideFrame', ...(tone ? { tone } : {}), body }],
  }) as unknown as Composition;

describe('slideAuthoringNotes', () => {
  it('passes a page slide that opens with a heading, and a lone quote with its source', () => {
    expect(
      slideAuthoringNotes(
        slide([{ type: 'slideHeading' }, { type: 'slideStats' }])
      )
    ).toEqual([]);
    expect(
      slideAuthoringNotes(
        slide([{ type: 'slideQuote' }, { type: 'slideSource' }])
      )
    ).toEqual([]);
    expect(
      slideAuthoringNotes(slide([{ type: 'slideSection' }], 'inverse'))
    ).toEqual([]);
  });

  it('notes a page slide without a heading and a source that is not last', () => {
    expect(
      slideAuthoringNotes(
        slide([
          { type: 'slideLayers' },
          { type: 'slideSource' },
          { type: 'slideStat' },
        ])
      )
    ).toEqual([
      expect.stringContaining('opens with `slideHeading`'),
      'A `slideSource` is the last node in the frame body.',
    ]);
  });
});
