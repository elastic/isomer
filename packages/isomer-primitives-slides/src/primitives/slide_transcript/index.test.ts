/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { example } from './examples';
import { markdown, text } from './index';

describe('slideTranscript', () => {
  it('prefixes each turn with its speaker in text', () => {
    expect(text(example).split('\n')).toEqual([
      'Retry loop',
      'User: How is checkout doing?',
      'Model: { "type": "view", "body": [{ "type": "slideTitle" }] }',
      'Host: body[0].title: expected string, received undefined',
      'Model: Retried with a title. It validates.',
    ]);
  });

  it('fences code turns in markdown', () => {
    expect(markdown(example)).toContain(
      '**Host**\n\n```text\nbody[0].title: expected string, received undefined\n```'
    );
  });
});
