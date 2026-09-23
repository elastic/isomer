/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { slidesPack } from '../../pack';

import { chatExample } from './examples';

const runtime = createIsomerRuntime({ packs: [slidesPack] });

describe('slideWindow', () => {
  it('captions its children with the title on Slack', () => {
    const { blocks } = runtime.surfaces.slack.render({
      type: 'view',
      body: [chatExample],
    });
    expect(blocks[0]).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '*Agent*' }],
    });
    expect(blocks.length).toBeGreaterThan(1);
  });

  it('brackets the title in text', () => {
    expect(runtime.surfaces.text.renderNode(chatExample)).toMatch(
      /^\[Agent\]\nUser: Show me the deck\./
    );
  });
});
