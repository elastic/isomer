/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DeckSlide } from '@elastic/isomer-deck/viewer';
import { slideJsx } from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';

import type { Deck } from './decks';

export const slugOf = (index: number, { title }: Composition): string =>
  [
    String(index).padStart(2, '0'),
    ...(title ?? 'slide').toLowerCase().split(/[^a-z0-9]+/),
  ]
    .filter(Boolean)
    .join('-');

// A stored slide the printer refuses still shows its JSON.
const jsxOf = (composition: Composition): string => {
  try {
    return slideJsx.toJsx(composition);
  } catch (error) {
    return `// ${error instanceof Error ? error.message : String(error)}`;
  }
};

/** Each slide drawn from its resolved composition, with its stored one as JSX and JSON. */
export const toSlides = ({ slides, stored }: Deck): DeckSlide[] =>
  slides.map((composition, index) => {
    const source = stored[index] ?? composition;
    return {
      slug: slugOf(index, composition),
      composition,
      sources: [
        { id: 'jsx', label: 'JSX', text: jsxOf(source) },
        { id: 'json', label: 'JSON', text: JSON.stringify(source, null, 2) },
      ],
    };
  });

export const number = (index: number): string => String(index).padStart(2, '0');

const units: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86_400],
  ['hour', 3_600],
  ['minute', 60],
];

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

/** `5 minutes ago`, or `just now` inside a minute. */
export const updatedAgo = (iso: string, now = Date.now()): string => {
  const seconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const [unit, size] of units) {
    if (Math.abs(seconds) >= size) {
      return relative.format(Math.round(seconds / size), unit);
    }
  }
  return 'just now';
};
