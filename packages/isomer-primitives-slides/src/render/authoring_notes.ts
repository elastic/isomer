/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

/** Page slides that open without a heading, alone but for a `slideSource`. */
const openers = new Set(['slideStatement', 'slideQuote']);

/**
 * Where a deck slide breaks the pack's authoring rules that validation leaves
 * open, since a frame also hosts a lone primitive outside a deck.
 */
export const slideAuthoringNotes = ({ body }: Composition): string[] => {
  const [frame] = body as { tone?: string; body?: { type?: string }[] }[];
  const types = (frame?.body ?? []).map(({ type }) => type ?? '');
  const [first, ...rest] = types;
  const notes: string[] = [];
  const opens =
    frame?.tone === 'inverse' ||
    first === 'slideHeading' ||
    (openers.has(first ?? '') && rest.every((type) => type === 'slideSource'));
  if (!opens) {
    notes.push(
      'A page slide opens with `slideHeading`, or holds a lone `slideStatement` or `slideQuote`; add a heading or use `tone: "inverse"`.'
    );
  }
  const source = types.indexOf('slideSource');
  if (source !== -1 && source !== types.length - 1) {
    notes.push('A `slideSource` is the last node in the frame body.');
  }
  return notes;
};
