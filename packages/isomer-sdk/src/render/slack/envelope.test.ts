/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { DefaultPackTypes } from '../../define/primitive_module';
import type {
  CaptionNode,
  FixtureNode,
  GroupNode,
} from '../../testing/sdk.fixtures';
import { fixtureDefinitions } from '../../testing/sdk.fixtures';
import { createPrimitiveDispatcher } from '../primitive_dispatch';

import type { SlackAssetCollector } from './assets';
import type { SlackBlock, SlackTableBlock } from './blocks';
import { SLACK_LIMITS } from './blocks';
import { renderSlackEnvelope, type SlackEnvelopeDispatcher } from './envelope';

interface SlackPackTypes extends DefaultPackTypes {
  slackBlock: SlackBlock;
  slackCollector: SlackAssetCollector;
}

const degradingDispatcher = (
  options: { collectAssets?: boolean } = {}
): SlackEnvelopeDispatcher<FixtureNode> =>
  createPrimitiveDispatcher<FixtureNode, SlackPackTypes>(fixtureDefinitions, {
    ...(options.collectAssets
      ? { isSlackAssetType: (type: string) => type === 'chart' }
      : {}),
  });

const mrkdwnOf = (blocks: readonly SlackBlock[]): string =>
  blocks
    .map((block) => (block.type === 'section' ? (block.text?.text ?? '') : ''))
    .join('\n');

const section = (text: string): SlackBlock => ({
  type: 'section',
  text: { type: 'mrkdwn', text },
});

const fieldSection = (text: string): SlackBlock => ({
  type: 'section',
  fields: [{ type: 'mrkdwn', text }],
});

const dispatcherFor = (
  blocks: ReadonlyArray<readonly SlackBlock[]>
): SlackEnvelopeDispatcher<{ type: string }> => {
  let index = 0;
  return {
    renderText: (node) => node.type,
    renderMarkdown: (node) => node.type,
    renderSlack: () => blocks[index++] ?? [],
  };
};

const cell = (text: string) => ({ type: 'raw_text' as const, text });

const tableBlock = (cellChars: number): SlackTableBlock => ({
  type: 'table',
  rows: [[cell('H')], [cell('x'.repeat(cellChars))]],
});

describe('Slack envelope transforms', () => {
  it('coalesces consecutive one-field sections into a fields grid', () => {
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'a' }, { type: 'b' }] },
      dispatcherFor([[fieldSection('A')], [fieldSection('B')]])
    );
    const fields = blocks.filter((block) => block.type === 'section');
    expect(fields).toEqual([
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: 'A' },
          { type: 'mrkdwn', text: 'B' },
        ],
      },
    ]);
  });

  it('inserts spacers between consecutive content sections', () => {
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'a' }, { type: 'b' }] },
      dispatcherFor([[section('A')], [section('B')]])
    );
    expect(blocks).toEqual([
      section('A'),
      { type: 'section', text: { type: 'mrkdwn', text: ' ' } },
      section('B'),
    ]);
  });

  it('degrades a table that exceeds the message-wide cell budget', () => {
    const over = SLACK_LIMITS.tableCellCharsPerMessage + 1;
    const { blocks } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'table' }] },
      dispatcherFor([[tableBlock(over)]])
    );
    expect(blocks.some((block) => block.type === 'table')).toBe(false);
    expect(blocks.some((block) => block.type === 'section')).toBe(true);
  });

  it('elides overflow past the block budget and appends a notice', () => {
    const count = SLACK_LIMITS.blocksPerMessage + 5;
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: Array.from({ length: count }, (_, index) => ({
          type: `n${index}`,
        })),
      },
      dispatcherFor(
        Array.from({ length: count }, (_, index) => [section(`N${index}`)])
      )
    );
    expect(blocks.length).toBe(SLACK_LIMITS.blocksPerMessage);
    const last = blocks[blocks.length - 1];
    expect(last?.type).toBe('context');
  });

  it('drops asset uploads whose placeholder blocks were budgeted out', () => {
    const filler = SLACK_LIMITS.blocksPerMessage + 2;
    const { blocks, assets } = renderSlackEnvelope(
      {
        type: 'view',
        body: [
          ...Array.from({ length: filler }, () => ({
            type: 'note' as const,
            body: 'n',
          })),
          { type: 'chart' as const, label: 'Series' },
        ],
      },
      degradingDispatcher({ collectAssets: true }),
      { collectAssets: true }
    );
    expect(assets).toEqual([]);
    expect(
      blocks.some(
        (block) => block.type === 'image' && block.slack_file?.ref !== undefined
      )
    ).toBe(false);
  });

  it('degrades a primitive with no slack renderer, preserving its content', () => {
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: [{ type: 'caption', body: 'Aside' } satisfies CaptionNode],
      },
      degradingDispatcher()
    );
    expect(mrkdwnOf(blocks)).toContain('Aside');
  });

  it('degrades a non-renderable child inside a container that renders its siblings', () => {
    // The container's own `slack` renderer returns a non-empty array for the
    // note, so nothing above it can notice the caption was dropped. Degrading
    // has to happen inside the recursion.
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: [
          {
            type: 'group',
            items: [
              { type: 'note', body: 'Rendered' },
              { type: 'caption', body: 'Degraded' },
            ],
          } satisfies GroupNode,
        ],
      },
      degradingDispatcher()
    );
    const text = mrkdwnOf(blocks);
    expect(text).toContain('Rendered');
    expect(text).toContain('Degraded');
  });

  it('keeps a node hidden from slack out of the output, including via the fallback', () => {
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: [
          {
            type: 'caption',
            body: 'Hidden',
            surfaces: ['text'],
          } satisfies CaptionNode,
        ],
      },
      degradingDispatcher()
    );
    expect(mrkdwnOf(blocks)).not.toContain('Hidden');
  });

  it('does not inject markdown when a slack renderer legitimately renders nothing', () => {
    // `group` has a slack renderer; its only child is hidden from slack, so it
    // returns []. That is "rendered, empty", not "cannot render", and must not
    // be back-filled from markdown — which would leak the hidden child.
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: [
          {
            type: 'group',
            items: [
              { type: 'note', body: 'HiddenFromSlack', surfaces: ['text'] },
            ],
          } satisfies GroupNode,
        ],
      },
      degradingDispatcher()
    );
    expect(mrkdwnOf(blocks)).not.toContain('HiddenFromSlack');
  });

  it('degrades a node with no slack renderer through its markdown', () => {
    const { blocks } = renderSlackEnvelope(
      {
        type: 'view',
        body: [{ type: 'caption', body: 'Aside' } satisfies CaptionNode],
      },
      degradingDispatcher()
    );
    expect(mrkdwnOf(blocks)).toContain('Aside');
  });

  it('clamps the alt text it records for an upload, not just the block', () => {
    const label = 'L'.repeat(SLACK_LIMITS.imageAltTextChars + 50);
    const { assets } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'chart', label }] },
      degradingDispatcher({ collectAssets: true }),
      { collectAssets: true }
    );
    expect(assets).toHaveLength(1);
    expect(assets[0]?.altText.length).toBeLessThanOrEqual(
      SLACK_LIMITS.imageAltTextChars
    );
  });

  it('namespaces allocated asset refs when a prefix is given', () => {
    const { blocks, assets } = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'chart', label: 'Series' }] },
      degradingDispatcher({ collectAssets: true }),
      { collectAssets: true, assetPrefix: 'charts' }
    );
    expect(assets[0]?.ref).toBe('charts-0');
    expect(blocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ slack_file: { ref: 'charts-0' } }),
      ])
    );
  });
});
