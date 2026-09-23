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
  SlideCycle,
  SlideFrame,
  SlideSplit,
  SlideTitle,
  SlideTranscript,
  SlideTurn,
  SlideWindow,
  toComposition,
} from '../shim';

/** A model's first try: a title node with no title. */
export const firstAttempt = {
  type: 'view',
  body: [{ type: 'slideTitle', lede: 'p99 latency is up 40%.' }],
};

/** The retry, after the parse errors went back to the model. */
export const secondAttempt = {
  type: 'view',
  body: [
    {
      type: 'slideTitle',
      title: 'Checkout is slow.',
      lede: 'p99 latency is up 40%.',
    },
  ],
};

const firstParse = runtime.parse(firstAttempt);
const secondParse = runtime.parse(secondAttempt);

export const agentSlide = toComposition(
  <Slide title="The agent path">
    <SlideFrame {...frame} chapter="The agent path" chapterNumber="06">
      <SlideTitle
        title="Parse what you don't trust. Validate what you built."
        lede="parse runs the schema alone, for model output. validate adds the semantic passes, for compositions code built."
        size="compact"
      />
      <SlideSplit
        ratio="wideRight"
        left={
          <SlideCycle
            center="Until it parses"
            nodes={['Authoring context', 'Model', 'parse', 'Errors']}
          />
        }
        right={
          <SlideWindow chrome="chat" title="Agent · compose from primitives">
            <SlideTranscript>
              <SlideTurn role="user">Show me checkout latency.</SlideTurn>
              <SlideTurn role="model" format="code">
                {JSON.stringify(firstAttempt.body[0])}
              </SlideTurn>
              <SlideTurn role="host" format="code">
                {firstParse.errors.map(formatValidationError).join('\n')}
              </SlideTurn>
              <SlideTurn role="model" format="code">
                {JSON.stringify(secondAttempt.body[0])}
              </SlideTurn>
              <SlideTurn role="host">
                {secondParse.valid
                  ? 'Parsed. Rendering it.'
                  : secondParse.errors.map(formatValidationError).join('\n')}
              </SlideTurn>
            </SlideTranscript>
          </SlideWindow>
        }
      />
    </SlideFrame>
  </Slide>
);
