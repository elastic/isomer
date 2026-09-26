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
  SlideFrame,
  SlideHeading,
  SlideSequence,
  toComposition,
} from '../shim';

import { firstAttempt } from './14_agent';

const firstErrors = runtime
  .parse(firstAttempt)
  .errors.map(formatValidationError)
  .join('; ');

export const sequenceSlide = toComposition(
  <Slide title="One agent turn, with a retry">
    <SlideFrame {...frame} sectionNumber="02" section="The model">
      <SlideHeading title="One agent turn, with a retry" />
      <SlideSequence
        actors={[
          { id: 'user', label: 'user' },
          { id: 'host', label: 'host', tone: 'accent' },
          { id: 'model', label: 'model' },
          { id: 'runtime', label: 'runtime', tone: 'primary' },
        ]}
        messages={[
          { from: 'user', to: 'host', label: 'Show me checkout latency.' },
          { from: 'host', to: 'model', label: 'Prompt + authoring context' },
          { from: 'model', to: 'host', label: 'Composition, attempt 1' },
          { from: 'host', to: 'runtime', label: 'parse()', mono: true },
          {
            from: 'runtime',
            to: 'host',
            label: firstErrors,
            mono: true,
          },
          { from: 'host', to: 'model', label: 'The errors, for a retry' },
          { from: 'model', to: 'host', label: 'Composition, attempt 2' },
          {
            from: 'host',
            to: 'runtime',
            label: 'parse(), then render',
            mono: true,
          },
        ]}
      />
    </SlideFrame>
  </Slide>
);
