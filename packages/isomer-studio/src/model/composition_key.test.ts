/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'node:crypto';

import type { Composition } from '@elastic/isomer-sdk';

import type { CalloutNode } from '../fixtures/components_pack';

import { canonicalJson, compositionKey } from './composition_key';

const callout: CalloutNode = {
  type: 'callout',
  title: 'Error rate spiked',
  body: 'Up 4x.',
};
const reorderedCallout: CalloutNode = {
  body: 'Up 4x.',
  title: 'Error rate spiked',
  type: 'callout',
};
const editedCallout: CalloutNode = { ...callout, body: 'Up 5x.' };

const composition: Composition = {
  type: 'view',
  theme: 'light',
  body: [callout],
};

describe('canonicalJson', () => {
  it('sorts keys at every depth and drops undefined properties', () => {
    expect(
      canonicalJson({ b: 1, a: { d: [1, undefined], c: undefined } })
    ).toBe('{"a":{"d":[1,null]},"b":1}');
  });
});

describe('compositionKey', () => {
  it('is the hex SHA-256 of the canonical JSON', async () => {
    expect(await compositionKey(composition)).toBe(
      createHash('sha256').update(canonicalJson(composition)).digest('hex')
    );
  });

  it('ignores key order', async () => {
    const reordered: Composition = {
      body: [reorderedCallout],
      theme: 'light',
      type: 'view',
    };
    expect(await compositionKey(reordered)).toBe(
      await compositionKey(composition)
    );
  });

  it('changes with a prop or the theme', async () => {
    const key = await compositionKey(composition);
    expect(
      await compositionKey({ ...composition, body: [editedCallout] })
    ).not.toBe(key);
    expect(await compositionKey({ ...composition, theme: 'dark' })).not.toBe(
      key
    );
  });
});
