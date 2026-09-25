/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValidationError } from '@elastic/isomer-sdk';

import { runtime } from '../runtime';
import {
  frame,
  Slide,
  SlideDefinitions,
  SlideFrame,
  SlideHeading,
  SlideSplit,
  SlideTranscript,
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

const firstParse = runtime.parse(firstAttempt);
const secondParse = runtime.parse(secondAttempt);

export const agentSlide = toComposition(
  <Slide title="The agent path retries until it parses">
    <SlideFrame {...frame} chapterNumber="02" chapter="The model">
      <SlideHeading title="The agent path retries until it parses" />
      <SlideSplit
        ratio="narrowLeft"
        left={{
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
        right={{
          items: [
            <SlideTranscript
              turns={[
                { role: 'user', text: 'Show me checkout latency.' },
                {
                  role: 'model',
                  format: 'code',
                  text: JSON.stringify(firstAttempt.body[0]),
                },
                {
                  role: 'host',
                  format: 'code',
                  text: firstParse.errors.map(formatValidationError).join('\n'),
                },
                {
                  role: 'model',
                  format: 'code',
                  text: JSON.stringify(secondAttempt.body[0]),
                },
                {
                  role: 'host',
                  text: secondParse.valid
                    ? 'Parsed. Rendering it.'
                    : secondParse.errors.map(formatValidationError).join('\n'),
                },
              ]}
            />,
          ],
        }}
      />
    </SlideFrame>
  </Slide>
);
