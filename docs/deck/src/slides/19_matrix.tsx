/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  slideDeckPrimitives,
  type SlideMatrixRow,
} from '@elastic/isomer-primitives-slides';

import {
  frame,
  Slide,
  SlideFrame,
  SlideHeading,
  SlideMatrix,
  SlideSource,
  toComposition,
} from '../shim';

/** Primitives this deck uses, with and without a Slack renderer of their own. */
export const matrixRows = [
  'slideHeading',
  'slideStatement',
  'slideTable',
  'slideCode',
  'slideTimeline',
  'slideSequence',
  'slideMatrix',
  'slideBars',
] as const;

/** Every primitive must register react, text, and markdown; html and svg draw its react renderer. */
const requiredColumns = ['react', 'html', 'svg', 'markdown', 'text'];

const rows = matrixRows.map((type): SlideMatrixRow => {
  const { renderers } = slideDeckPrimitives.find(
    (definition) => definition.type === type
  )!;
  const slack = 'slack' in renderers && renderers.slack !== undefined;
  return {
    label: `\`${type}\``,
    marks: [
      ...requiredColumns.map(() => 'full' as const),
      slack ? 'full' : 'partial',
    ],
  };
});

export const matrixSlide = toComposition(
  <Slide title="Slack gets Markdown when a primitive has no blocks">
    <SlideFrame {...frame} chapterNumber="03" chapter="How it works">
      <SlideHeading
        title="Slack gets Markdown when a primitive has no blocks"
        lede="**Partial** means the Slack surface converts the primitive's Markdown to Block Kit."
      />
      <SlideMatrix columns={[...requiredColumns, 'slack']} {...{ rows }} />
      <SlideSource text="The renderers each primitive registers in `slideDeckPrimitives`" />
    </SlideFrame>
  </Slide>
);
