/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { SlackAssetCollector } from './assets';
import {
  SLACK_LIMITS,
  type SlackBlock,
  type SlackContainerBlock,
  type SlackSectionBlock,
  type SlackTableBlock,
} from './blocks';
import { slackContainer } from './container';
import type { SlackEnvelopeDispatcher } from './envelope';
import { renderPostable } from './postable.fixtures';
import { unmodeledSlackBlock } from './unmodeled';

const mrkdwn = (text: string) => ({ type: 'mrkdwn' as const, text });
const plain = (text: string) => ({ type: 'plain_text' as const, text });
const section = (text: string): SlackSectionBlock => ({
  type: 'section',
  text: mrkdwn(text),
});
const fieldSection = (text: string): SlackSectionBlock => ({
  type: 'section',
  fields: [mrkdwn(text)],
});
const sections = (count: number) =>
  Array.from({ length: count }, (_, index) => section(`s${index}`));
const container = (
  child_blocks: SlackContainerBlock['child_blocks'],
  fields: Partial<SlackContainerBlock> = {}
): SlackContainerBlock => ({
  type: 'container',
  title: plain('Impact'),
  child_blocks,
  ...fields,
});
const table = (cellChars: number): SlackTableBlock => ({
  type: 'table',
  rows: [
    [{ type: 'raw_text', text: 'H' }],
    [{ type: 'raw_text', text: 'x'.repeat(cellChars) }],
  ],
});

const render = (blocks: readonly SlackBlock[]) =>
  renderPostable({ type: 'view', body: [{ type: 'n' }] }, {
    renderText: ({ type }) => type,
    renderMarkdown: ({ type }) => type,
    renderSlack: () => blocks,
  } satisfies SlackEnvelopeDispatcher<{ type: string }>).blocks;

const onlyContainer = (blocks: readonly SlackBlock[]): SlackContainerBlock => {
  const [first] = blocks;
  expect(blocks).toHaveLength(1);
  if (first?.type !== 'container') {
    throw new Error(`expected a container, got ${first?.type}`);
  }
  return first;
};

describe('slackContainer', () => {
  it('holds between one and ten children in one container', () => {
    expect(slackContainer('Impact', sections(1))).toEqual([
      container(sections(1), { title: { ...plain('Impact'), emoji: true } }),
    ]);
    expect(
      onlyContainer(slackContainer('Impact', sections(10))).child_blocks
    ).toHaveLength(10);
  });

  it('falls back to a header and the blocks past ten children, or with none', () => {
    const fallback = slackContainer('Impact', sections(11), {
      fallbackLevel: 3,
    });
    expect(fallback).toEqual([
      {
        type: 'header',
        text: { ...plain('Impact'), emoji: true },
        level: 3,
      },
      ...sections(11),
    ]);
    expect(slackContainer('Impact', [])).toEqual([
      { type: 'header', text: { ...plain('Impact'), emoji: true } },
    ]);
  });

  it('unwraps a nested container and keeps the outer one', () => {
    const inner = container(sections(2), {
      title: plain('Hypotheses'),
      subtitle: mrkdwn('Ranked'),
    });
    expect(
      onlyContainer(slackContainer('Impact', [section('lead'), inner]))
        .child_blocks
    ).toEqual([
      section('lead'),
      { type: 'header', text: plain('Hypotheses') },
      { type: 'context', elements: [mrkdwn('Ranked')] },
      ...sections(2),
    ]);
  });

  it('leads an unwrapped container with its rich text title', () => {
    const rich_text_title = {
      type: 'rich_text' as const,
      elements: [
        {
          type: 'rich_text_section' as const,
          elements: [{ type: 'text' as const, text: 'Rich' }],
        },
      ],
    };
    const inner: SlackContainerBlock = {
      type: 'container',
      rich_text_title,
      child_blocks: sections(1),
    };
    expect(
      onlyContainer(slackContainer('Impact', [inner])).child_blocks
    ).toEqual([rich_text_title, ...sections(1)]);
  });

  it('passes its fields through and clamps the title', () => {
    const icon = {
      type: 'image' as const,
      image_url: 'https://x.test/i.png',
      alt_text: 'i',
    };
    const block = onlyContainer(
      slackContainer('t'.repeat(200), sections(1), {
        block_id: 'impact',
        subtitle: mrkdwn('Since Monday'),
        icon,
        width: 'wide',
        is_collapsible: true,
        default_collapsed: true,
        has_header_divider: true,
      })
    );
    expect(block).toMatchObject({
      block_id: 'impact',
      subtitle: mrkdwn('Since Monday'),
      icon,
      width: 'wide',
      is_collapsible: true,
      default_collapsed: true,
      has_header_divider: true,
    });
    expect(block.title?.text).toHaveLength(SLACK_LIMITS.containerTitleChars);
  });

  it('keeps a child from unmodeledSlackBlock inside', () => {
    const file = unmodeledSlackBlock({ type: 'file', source: 'remote' });
    expect(
      onlyContainer(slackContainer('Impact', [file])).child_blocks
    ).toEqual([file]);
  });
});

describe('the Slack envelope and containers', () => {
  it('fits the container and every child', () => {
    const long = 'x'.repeat(SLACK_LIMITS.sectionTextChars + 1);
    const block = onlyContainer(
      render([
        container(
          [
            section(long),
            {
              type: 'image',
              image_url: `https://x.test/${'p'.repeat(SLACK_LIMITS.imageUrlChars)}`,
              alt_text: 'chart',
            },
          ],
          {
            title: plain('t'.repeat(SLACK_LIMITS.containerTitleChars + 1)),
            subtitle: mrkdwn(
              's'.repeat(SLACK_LIMITS.containerSubtitleChars + 1)
            ),
            icon: {
              type: 'image',
              image_url: `https://x.test/${'p'.repeat(SLACK_LIMITS.imageUrlChars)}`,
              alt_text: 'i',
            },
          }
        ),
      ])
    );
    expect(block.title?.text).toHaveLength(SLACK_LIMITS.containerTitleChars);
    expect(block.subtitle?.text).toHaveLength(
      SLACK_LIMITS.containerSubtitleChars
    );
    expect(block.icon).toBeUndefined();
    expect(block.child_blocks).toEqual([
      section(`${'x'.repeat(SLACK_LIMITS.sectionTextChars - 1)}…`),
      { type: 'context', elements: [mrkdwn('chart')] },
    ]);
  });

  it('splits a long rich text title, kept or unwrapped', () => {
    const long = 'r'.repeat(SLACK_LIMITS.sectionTextChars + 1);
    const rich_text_title = {
      type: 'rich_text' as const,
      elements: [
        {
          type: 'rich_text_section' as const,
          elements: [{ type: 'text' as const, text: long }],
        },
      ],
    };
    const lengths = (block: SlackBlock | undefined) =>
      block?.type === 'rich_text'
        ? block.elements.map(({ elements }) =>
            elements.reduce(
              (sum, inline) =>
                sum + ('text' in inline ? (inline.text ?? '') : '').length,
              0
            )
          )
        : [];
    const split = [SLACK_LIMITS.sectionTextChars, 1];

    const kept = onlyContainer(
      render([
        { type: 'container', rich_text_title, child_blocks: sections(1) },
      ])
    );
    expect(lengths(kept.rich_text_title)).toEqual(split);

    const [unwrapped] = render([
      { type: 'container', rich_text_title, child_blocks: sections(11) },
    ]);
    expect(lengths(unwrapped)).toEqual(split);
  });

  it('counts a table inside a container toward the message cell budget', () => {
    const cells = SLACK_LIMITS.tableCellCharsPerMessage / 2 + 1;
    const [kept, held] = render([table(cells), container([table(cells)])]);
    expect(kept?.type).toBe('table');
    expect(
      held?.type === 'container' && held.child_blocks.map(({ type }) => type)
    ).toEqual(['rich_text']);
  });

  it('unwraps a container that splitting takes past ten children', () => {
    const context: SlackBlock = {
      type: 'context',
      elements: Array.from(
        { length: SLACK_LIMITS.contextElements + 1 },
        (_, index) => mrkdwn(`c${index}`)
      ),
    };
    const blocks = render([container([...sections(9), context])]);
    expect(blocks[0]).toEqual({ type: 'header', text: plain('Impact') });
    expect(blocks.some(({ type }) => type === 'container')).toBe(false);
  });

  it('coalesces field sections inside a container, not across its edge', () => {
    const blocks = render([
      fieldSection('a'),
      container([fieldSection('b'), fieldSection('c')]),
    ]);
    expect(blocks).toEqual([
      fieldSection('a'),
      container([{ type: 'section', fields: [mrkdwn('b'), mrkdwn('c')] }]),
    ]);
  });

  it('puts no spacer inside or beside a container', () => {
    expect(
      render([section('a'), container(sections(2)), section('b')])
    ).toEqual([section('a'), container(sections(2)), section('b')]);
  });

  it('counts a container as one block, however many children it holds', () => {
    const blocks = render(
      Array.from({ length: SLACK_LIMITS.blocksPerMessage }, () =>
        container(sections(SLACK_LIMITS.containerChildBlocks))
      )
    );
    expect(blocks).toHaveLength(SLACK_LIMITS.blocksPerMessage);
    expect(blocks.every(({ type }) => type === 'container')).toBe(true);
  });

  it('keeps the upload of an image inside a container', () => {
    const { assets } = renderPostable(
      { type: 'view', body: [{ type: 'chart' }] },
      {
        renderText: ({ type }) => type,
        renderMarkdown: ({ type }) => type,
        renderSlack: (node, collector?: SlackAssetCollector) => [
          container([
            {
              type: 'image',
              alt_text: 'chart',
              slack_file: { ref: collector!.allocate(node, 'chart') },
            },
          ]),
        ],
      } satisfies SlackEnvelopeDispatcher<{ type: string }>,
      { collectAssets: true }
    );
    expect(assets.map(({ ref }) => ref)).toEqual(['asset-0']);
  });
});
