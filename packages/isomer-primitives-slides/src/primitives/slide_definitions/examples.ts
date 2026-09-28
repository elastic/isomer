/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideDefinitionsNode } from './schema';

/** Canonical {@link SlideDefinitionsNode} example. */
export const example: SlideDefinitionsNode = {
  type: 'slideDefinitions',
  items: [
    {
      term: 'authorization',
      body: 'The bank holds the funds. **Nothing has moved yet.**',
    },
    {
      term: 'capture',
      body: 'The merchant claims the held funds, usually at shipment.',
    },
    {
      term: 'settlement',
      body: 'The money lands in the merchant account, one to two days later.',
    },
  ],
};

/** A single term, the smallest glossary. */
export const singleExample: SlideDefinitionsNode = {
  type: 'slideDefinitions',
  items: [
    {
      term: 'blameless review',
      body: 'An incident write-up that names causes and fixes, never people.',
    },
  ],
};

/** Six terms, the most a slide holds. */
export const fullExample: SlideDefinitionsNode = {
  type: 'slideDefinitions',
  items: [
    { term: 'picker', body: 'Walks the store aisles and fills the basket.' },
    { term: 'substitute', body: 'A replacement item the customer approved.' },
    { term: 'slot', body: 'A one-hour delivery window the customer booked.' },
    { term: 'handoff', body: 'The moment a bagged order leaves the store.' },
    { term: 'dasher', body: 'Drives the order from the store to the door.' },
    { term: 'drop', body: 'Proof of delivery: a photo and a timestamp.' },
  ],
};

/** Conformance examples for {@link SlideDefinitionsNode}. */
export const examples: SlideDefinitionsNode[] = [
  example,
  singleExample,
  fullExample,
];
