/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Composition } from '@elastic/isomer-sdk';

import { titleSlide } from './slides/00_title';
import { problemSlide } from './slides/01_problem';
import { moveSlide } from './slides/02_move';
import { lineSlide } from './slides/03_line';
import { vocabularySlide } from './slides/04_vocabulary';
import { pathsSlide } from './slides/05_paths';
import { agentSlide } from './slides/06_agent';
import { renderSlide } from './slides/07_render';
import { surfacesSlide } from './slides/08_surfaces';
import { proofSlide } from './slides/09_proof';
import { imagesSlide } from './slides/10_images';
import { anatomySlide } from './slides/11_anatomy';
import { themeSlide } from './slides/12_theme';
import { dogfoodSlide } from './slides/13_dogfood';
import { growingSlide } from './slides/14_growing';
import { evalsSlide } from './slides/15_evals';
import { shipsSlide } from './slides/16_ships';
import { startSlide } from './slides/17_start';

/** One slide: a URL-safe name and the composition every surface renders. */
export interface DeckSlide {
  slug: string;
  composition: Composition;
}

/** A deck is a `Composition[]`; sequencing it is the host's job, and this is the host. */
export const deck: readonly DeckSlide[] = [
  { slug: 'title', composition: titleSlide },
  { slug: 'problem', composition: problemSlide },
  { slug: 'move', composition: moveSlide },
  { slug: 'line', composition: lineSlide },
  { slug: 'vocabulary', composition: vocabularySlide },
  { slug: 'paths', composition: pathsSlide },
  { slug: 'agent', composition: agentSlide },
  { slug: 'render', composition: renderSlide },
  { slug: 'surfaces', composition: surfacesSlide },
  { slug: 'proof', composition: proofSlide },
  { slug: 'images', composition: imagesSlide },
  { slug: 'anatomy', composition: anatomySlide },
  { slug: 'theme', composition: themeSlide },
  { slug: 'dogfood', composition: dogfoodSlide },
  { slug: 'growing', composition: growingSlide },
  { slug: 'evals', composition: evalsSlide },
  { slug: 'ships', composition: shipsSlide },
  { slug: 'start', composition: startSlide },
];
