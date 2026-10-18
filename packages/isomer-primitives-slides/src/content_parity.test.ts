/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Degraded surfaces carry every word the image draws.

import { readdirSync } from 'node:fs';

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import {
  htmlText,
  literalRows,
  missingFrom,
  rows,
  runtime,
  SLACK_SHARDS,
  surfaces,
  terminators,
  withTail,
} from './content_parity.fixtures';

describe('content parity', () => {
  it.each(rows)('$name carries every authored string', ({ node }) => {
    for (const [surface, render] of Object.entries(surfaces)) {
      expect(missingFrom(render(node), node), surface).toEqual([]);
    }
  });

  it.each(rows)('$name draws every authored string', ({ node }) => {
    expect(missingFrom(htmlText(node), node)).toEqual([]);
  });
});

const terminatorRows = rows.flatMap((row) =>
  Object.entries(terminators).map(([mark, terminator]) => ({
    ...row,
    mark,
    terminator,
  }))
);

describe('line terminators in one-line fields', () => {
  it.each(terminatorRows)(
    '$name reads as a space after $mark',
    ({ node, terminator }) => {
      const broken = withTail(node, `${terminator}tail`) as PrimitiveNode;
      const spaced = withTail(node, ' tail') as PrimitiveNode;
      expect(surfaces.text(broken)).toBe(surfaces.text(spaced));
      expect(runtime.surfaces.markdown.renderNode(broken)).toBe(
        runtime.surfaces.markdown.renderNode(spaced)
      );
      expect(runtime.surfaces.slack.renderNode(broken).blocks).toEqual(
        runtime.surfaces.slack.renderNode(spaced).blocks
      );
      expect(missingFrom(surfaces.text(spaced), spaced)).toEqual([]);
    }
  );
});

describe('entity-like text and unpaired delimiters', () => {
  it.each(literalRows)('$name prints them as authored', ({ node }) => {
    for (const [surface, render] of Object.entries(surfaces)) {
      expect(missingFrom(render(node), node), surface).toEqual([]);
    }
  });
});

describe('Slack formatting characters', () => {
  it('runs every shard', () => {
    const shards = readdirSync(new URL('.', import.meta.url)).filter((file) =>
      /^content_parity_slack_\d+\.test\.ts$/.test(file)
    );
    expect(shards.sort()).toEqual(
      Array.from(
        { length: SLACK_SHARDS },
        (_, index) => `content_parity_slack_${index + 1}.test.ts`
      )
    );
  });
});
