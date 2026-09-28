/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideDiffLine } from '@elastic/isomer-primitives-slides';
import { formatValidationError } from '@elastic/isomer-sdk';

import { runtime } from '../runtime';
import {
  frame,
  Slide,
  SlideDefinitions,
  SlideDiff,
  SlideFrame,
  SlideHeading,
  SlideSplit,
  toComposition,
} from '../shim';

/** A model's first try: a heading with no title. */
export const firstAttempt = {
  type: 'view',
  body: [{ type: 'slideHeading', lede: 'p99 is up 40%.' }],
};

/** The retry, after the parse errors went back to the model. */
export const secondAttempt = {
  type: 'view',
  body: [
    {
      type: 'slideHeading',
      title: 'Checkout is slow',
      lede: 'p99 is up 40%.',
    },
  ],
};

const firstErrors = runtime
  .parse(firstAttempt)
  .errors.map(formatValidationError)
  .join('; ');

const linesOf = (value: unknown) => JSON.stringify(value, null, 2).split('\n');

/** A line diff over the longest common subsequence. */
const diffLines = (
  before: readonly string[],
  after: readonly string[]
): SlideDiffLine[] => {
  const common = before.map(() => after.map(() => 0));
  const at = (i: number, j: number) => common[i]?.[j] ?? 0;
  for (let i = before.length - 1; i >= 0; i--) {
    for (let j = after.length - 1; j >= 0; j--) {
      common[i]![j] =
        before[i] === after[j]
          ? at(i + 1, j + 1) + 1
          : Math.max(at(i + 1, j), at(i, j + 1));
    }
  }
  const lines: SlideDiffLine[] = [];
  let i = 0;
  let j = 0;
  while (i < before.length || j < after.length) {
    if (i < before.length && j < after.length && before[i] === after[j]) {
      lines.push({ text: before[i++]! });
      j++;
    } else if (
      j < after.length &&
      (i === before.length || at(i, j + 1) >= at(i + 1, j))
    ) {
      lines.push({ text: after[j++]!, op: 'add' });
    } else {
      lines.push({ text: before[i++]!, op: 'remove' });
    }
  }
  return lines;
};

export const agentSlide = toComposition(
  <Slide title="The agent path retries until it parses">
    <SlideFrame {...frame} sectionNumber="02" section="The model">
      <SlideHeading
        title="The agent path retries until it parses"
        lede={`The host sent back \`${firstErrors}\`. The second attempt added the title.`}
      />
      <SlideSplit
        ratio="aside"
        divider="hairline"
        left={{
          items: [
            <SlideDiff
              file="composition.json · attempt 1 to attempt 2"
              language="json"
              lines={diffLines(linesOf(firstAttempt), linesOf(secondAttempt))}
            />,
          ],
        }}
        right={{
          label: 'Two checks',
          items: [
            <SlideDefinitions
              items={[
                { term: 'parse', body: 'The schema alone. For model output.' },
                {
                  term: 'validate',
                  body: 'The schema plus semantic passes. For compositions code built.',
                },
              ]}
            />,
          ],
        }}
      />
    </SlideFrame>
  </Slide>
);
