/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { missingFromSlack, mrkdwnShard } from './content_parity.fixtures';

describe('Slack formatting characters', () => {
  it.each(mrkdwnShard(1))('$name keeps $kind as authored', ({ node }) => {
    expect(missingFromSlack(node)).toEqual([]);
  });
});
