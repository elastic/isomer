/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import type { Theme } from '../surfaces';

/** The ways the source panel can show a slide. */
export const sourceIds = ['jsx', 'json'] as const;

/** One of {@link sourceIds}. */
export type SourceId = (typeof sourceIds)[number];

/** One way to read a slide's source. */
export interface SlideSource {
  id: SourceId;
  label: string;
  text: string;
  /** Where the text lives, shown above it. */
  file?: string;
}

/** One slide: a URL-safe name, the composition, and its sources, in panel tab order. */
export interface DeckSlide {
  slug: string;
  composition: Composition;
  sources: readonly SlideSource[];
}

/** Where the viewer finds a slide's rendered PNG. */
export type PngUrl = (slide: DeckSlide, theme: Theme) => string;
