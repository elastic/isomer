/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideTranscriptNode } from './schema';

/** Canonical {@link SlideTranscriptNode} example. */
export const example: SlideTranscriptNode = {
  type: 'slideTranscript',
  label: 'Booking a delivery slot',
  turns: [
    { role: 'user', text: 'Deliver my groceries tomorrow morning.' },
    {
      role: 'model',
      format: 'code',
      text: '{"action":"book","window":"tomorrow"}',
    },
    {
      role: 'host',
      format: 'code',
      text: 'window: expected a start and end time',
    },
    {
      role: 'model',
      format: 'code',
      text: '{"action":"book","window":{"start":"08:00","end":"10:00"}}',
    },
    { role: 'host', text: 'Booked for 8 to 10 tomorrow.' },
  ],
};

/** No label, prose only, with a line break kept. */
export const plainExample: SlideTranscriptNode = {
  type: 'slideTranscript',
  turns: [
    { role: 'user', text: 'Why did the nightly build fail?' },
    {
      role: 'model',
      text: 'The lockfile changed without a version bump.\nRun the install step again.',
    },
  ],
};

/** Conformance examples for {@link SlideTranscriptNode}. */
export const examples: SlideTranscriptNode[] = [example, plainExample];
