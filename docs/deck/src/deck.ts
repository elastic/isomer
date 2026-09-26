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
import { agendaSlide } from './slides/01_agenda';
import { sectionProblemSlide } from './slides/02_section_problem';
import { problemSlide } from './slides/03_problem';
import { documentSlide } from './slides/04_document';
import { dogfoodSlide } from './slides/05_dogfood';
import { quoteSlide } from './slides/06_quote';
import { sectionModelSlide } from './slides/07_section_model';
import { statementSlide } from './slides/08_statement';
import { lineSlide } from './slides/09_line';
import { layersSlide } from './slides/10_layers';
import { vocabularySlide } from './slides/11_vocabulary';
import { pathsSlide } from './slides/12_paths';
import { sequenceSlide } from './slides/13_sequence';
import { agentSlide } from './slides/14_agent';
import { sectionHowSlide } from './slides/15_section_how';
import { renderSlide } from './slides/16_render';
import { surfacesSlide } from './slides/17_surfaces';
import { slackSlide } from './slides/18_slack';
import { matrixSlide } from './slides/19_matrix';
import { posturesSlide } from './slides/20_postures';
import { quadrantSlide } from './slides/21_quadrant';
import { proofSlide } from './slides/22_proof';
import { imagesSlide } from './slides/23_images';
import { sectionPackSlide } from './slides/24_section_pack';
import { anatomySlide } from './slides/25_anatomy';
import { barsSlide } from './slides/26_bars';
import { growthSlide } from './slides/27_growth';
import { timelineAnatomySlide } from './slides/28_timeline_anatomy';
import { themeSlide } from './slides/29_theme';
import { evalsSlide } from './slides/30_evals';
import { sectionStartSlide } from './slides/31_section_start';
import { packagesSlide } from './slides/32_packages';
import { commandsSlide } from './slides/33_commands';
import { roadmapSlide } from './slides/34_roadmap';
import { startSlide } from './slides/35_start';
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
  slide('01_agenda', agendaSlide),
  slide('02_section_problem', sectionProblemSlide),
  slide('03_problem', problemSlide),
  slide('04_document', documentSlide),
  slide('05_dogfood', dogfoodSlide),
  slide('06_quote', quoteSlide),
  slide('07_section_model', sectionModelSlide),
  slide('08_statement', statementSlide),
  slide('09_line', lineSlide),
  slide('10_layers', layersSlide),
  slide('11_vocabulary', vocabularySlide),
  slide('12_paths', pathsSlide),
  slide('13_sequence', sequenceSlide),
  slide('14_agent', agentSlide),
  slide('15_section_how', sectionHowSlide),
  slide('16_render', renderSlide),
  slide('17_surfaces', surfacesSlide),
  slide('18_slack', slackSlide),
  slide('19_matrix', matrixSlide),
  slide('20_postures', posturesSlide),
  slide('21_quadrant', quadrantSlide),
  slide('22_proof', proofSlide),
  slide('23_images', imagesSlide),
  slide('24_section_pack', sectionPackSlide),
  slide('25_anatomy', anatomySlide),
  slide('26_bars', barsSlide),
  slide('27_growth', growthSlide),
  slide('28_timeline_anatomy', timelineAnatomySlide),
  slide('29_theme', themeSlide),
  slide('30_evals', evalsSlide),
  slide('31_section_start', sectionStartSlide),
  slide('32_packages', packagesSlide),
  slide('33_commands', commandsSlide),
  slide('34_roadmap', roadmapSlide),
  slide('35_start', startSlide),
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
