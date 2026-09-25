/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  resolveSlideRenders,
  type SlideFrameNode,
} from '@elastic/isomer-primitives-slides';
import type { Composition } from '@elastic/isomer-sdk';

import { titleSlide } from './slides/00_title';
import { sectionProblemSlide } from './slides/01_section_problem';
import { problemSlide } from './slides/02_problem';
import { documentSlide } from './slides/03_document';
import { dogfoodSlide } from './slides/04_dogfood';
import { sectionModelSlide } from './slides/05_section_model';
import { lineSlide } from './slides/06_line';
import { vocabularySlide } from './slides/07_vocabulary';
import { pathsSlide } from './slides/08_paths';
import { agentSlide } from './slides/09_agent';
import { sectionHowSlide } from './slides/10_section_how';
import { renderSlide } from './slides/11_render';
import { surfacesSlide } from './slides/12_surfaces';
import { slackSlide } from './slides/13_slack';
import { posturesSlide } from './slides/14_postures';
import { proofSlide } from './slides/15_proof';
import { imagesSlide } from './slides/16_images';
import { sectionPackSlide } from './slides/17_section_pack';
import { anatomySlide } from './slides/18_anatomy';
import { themeSlide } from './slides/19_theme';
import { evalsSlide } from './slides/20_evals';
import { sectionStartSlide } from './slides/21_section_start';
import { packagesSlide } from './slides/22_packages';
import { startSlide } from './slides/23_start';
import type { DeckSlide } from './viewer/types';

const sources = import.meta.glob<string>('./slides/[0-9][0-9]_*.tsx', {
  eager: true,
  import: 'default',
  query: '?raw',
});

export type { DeckSlide };

const licenseHeader = /^\/\*[\s\S]*?\*\/\s*/;

const slugOf = (file: string) => file.replace(/^\d+_/, '').replace(/_/g, '-');

const slide = (file: string, composition: Composition): DeckSlide => {
  const source = sources[`./slides/${file}.tsx`];
  if (source === undefined) {
    throw new Error(`deck: no slide file "${file}.tsx"`);
  }
  return {
    slug: slugOf(file),
    composition,
    sources: [
      {
        id: 'jsx',
        label: 'JSX',
        text: source.replace(licenseHeader, ''),
        file: `docs/deck/src/slides/${file}.tsx`,
      },
      {
        id: 'json',
        label: 'JSON',
        text: JSON.stringify(composition, null, 2),
      },
    ],
  };
};

const authored: readonly DeckSlide[] = [
  slide('00_title', titleSlide),
  slide('01_section_problem', sectionProblemSlide),
  slide('02_problem', problemSlide),
  slide('03_document', documentSlide),
  slide('04_dogfood', dogfoodSlide),
  slide('05_section_model', sectionModelSlide),
  slide('06_line', lineSlide),
  slide('07_vocabulary', vocabularySlide),
  slide('08_paths', pathsSlide),
  slide('09_agent', agentSlide),
  slide('10_section_how', sectionHowSlide),
  slide('11_render', renderSlide),
  slide('12_surfaces', surfacesSlide),
  slide('13_slack', slackSlide),
  slide('14_postures', posturesSlide),
  slide('15_proof', proofSlide),
  slide('16_images', imagesSlide),
  slide('17_section_pack', sectionPackSlide),
  slide('18_anatomy', anatomySlide),
  slide('19_theme', themeSlide),
  slide('20_evals', evalsSlide),
  slide('21_section_start', sectionStartSlide),
  slide('22_packages', packagesSlide),
  slide('23_start', startSlide),
];

/**
 * Fills in what only the whole deck knows: a section's links to its slides,
 * and every `slideRender` that names another slide by slug.
 */
const resolve = (slides: readonly DeckSlide[]): DeckSlide[] => {
  const compositions = resolveSlideRenders(slides);
  return slides.map((entry, index) => {
    const composition = compositions[index]!;
    const [frame] = composition.body as SlideFrameNode[];
    const [first] = frame?.body ?? [];
    if (first?.type !== 'slideSection') {
      return { ...entry, composition };
    }
    const next = slides.findIndex(
      ({ composition: later }, position) =>
        position > index &&
        (later.body[0] as SlideFrameNode).body[0]?.type === 'slideSection'
    );
    const owned = slides.slice(index + 1, next === -1 ? undefined : next);
    const section = {
      ...first,
      hrefs: owned.map(({ slug }) => `?slide=${slug}`),
    };
    return {
      ...entry,
      composition: {
        ...composition,
        body: [{ ...frame!, body: [section, ...frame!.body.slice(1)] }],
      },
    };
  });
};

/** A deck is a `Composition[]`; sequencing it is the host's job, and this is the host. */
export const deck: readonly DeckSlide[] = resolve(authored);
