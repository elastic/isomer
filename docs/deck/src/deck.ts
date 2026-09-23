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
import { degradesSlide } from './slides/09_degrades';
import { proofSlide } from './slides/10_proof';
import { imagesSlide } from './slides/11_images';
import { anatomySlide } from './slides/12_anatomy';
import { themeSlide } from './slides/13_theme';
import { dogfoodSlide } from './slides/14_dogfood';
import { growingSlide } from './slides/15_growing';
import { evalsSlide } from './slides/16_evals';
import { shipsSlide } from './slides/17_ships';
import { startSlide } from './slides/18_start';

const sources = import.meta.glob<string>('./slides/[0-9][0-9]_*.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
});

/** One slide: its file, a URL-safe name, the composition, and the TSX it was authored as. */
export interface DeckSlide {
  file: string;
  slug: string;
  composition: Composition;
  source: string;
}

const licenseHeader = /^\/\*[\s\S]*?\*\/\s*/;

const slide = (file: string, composition: Composition): DeckSlide => {
  const source = sources[`./slides/${file}.tsx`];
  if (source === undefined) {
    throw new Error(`deck: no slide file "${file}.tsx"`);
  }
  return {
    file: `docs/deck/src/slides/${file}.tsx`,
    slug: file.replace(/^\d+_/, ''),
    composition,
    source: source.replace(licenseHeader, ''),
  };
};

/** A deck is a `Composition[]`; sequencing it is the host's job, and this is the host. */
export const deck: readonly DeckSlide[] = [
  slide('00_title', titleSlide),
  slide('01_problem', problemSlide),
  slide('02_move', moveSlide),
  slide('03_line', lineSlide),
  slide('04_vocabulary', vocabularySlide),
  slide('05_paths', pathsSlide),
  slide('06_agent', agentSlide),
  slide('07_render', renderSlide),
  slide('08_surfaces', surfacesSlide),
  slide('09_degrades', degradesSlide),
  slide('10_proof', proofSlide),
  slide('11_images', imagesSlide),
  slide('12_anatomy', anatomySlide),
  slide('13_theme', themeSlide),
  slide('14_dogfood', dogfoodSlide),
  slide('15_growing', growingSlide),
  slide('16_evals', evalsSlide),
  slide('17_ships', shipsSlide),
  slide('18_start', startSlide),
];
