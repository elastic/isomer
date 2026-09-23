/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runtime } from '../runtime';
import {
  frame,
  Slide,
  SlideCode,
  SlideFrame,
  SlideSplit,
  SlideStack,
  SlideTitle,
  SlideWindow,
  toComposition,
} from '../shim';

import { lineSlide } from './03_line';

const markdown = runtime.surfaces.markdown.render(lineSlide);
const text = runtime.surfaces.text.render(lineSlide);
const { blocks } = runtime.surfaces.slack.render(lineSlide);

const blockText = (block: (typeof blocks)[number]): string => {
  if (block.type === 'header' || block.type === 'section') {
    return block.text?.text ?? '';
  }
  if (block.type === 'context') {
    const [first] = block.elements;
    return first && 'text' in first ? String(first.text) : '';
  }
  return '';
};

const clip = (value: string, max: number) => {
  const line = value.replace(/\s+/g, ' ').trim();
  return line.length > max ? `${line.slice(0, max - 1)}…` : line;
};

/** One line per Block Kit block: its type and the start of its text. Spacers are skipped. */
const slackSummary = blocks
  .filter((block) => block.type !== 'section' || blockText(block).trim())
  .map((block) => `${block.type.padEnd(8)}${clip(blockText(block), 40)}`)
  .join('\n');

export const proofSlide = toComposition(
  <Slide title="Proof">
    <SlideFrame {...frame} chapter="Proof" chapterNumber="10">
      <SlideTitle
        title="Slide 03, three more ways."
        lede="Nothing here is a mock. The runtime rendered these when the deck was built."
        size="compact"
      />
      <SlideSplit
        left={
          <SlideWindow chrome="terminal" title="surfaces.markdown.render">
            <SlideCode language="md">{markdown}</SlideCode>
          </SlideWindow>
        }
        right={
          <SlideStack>
            <SlideWindow chrome="terminal" title="surfaces.text.render">
              <SlideCode language="text">{text}</SlideCode>
            </SlideWindow>
            <SlideWindow chrome="slack" title="surfaces.slack.render">
              <SlideCode language="text">{slackSummary}</SlideCode>
            </SlideWindow>
          </SlideStack>
        }
      />
    </SlideFrame>
  </Slide>
);
