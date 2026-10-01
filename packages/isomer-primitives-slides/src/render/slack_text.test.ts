/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  renderSlackEnvelope,
  SLACK_LIMITS,
  type SlackBlock,
  slackLinkUrl,
  type SlackRichTextBlockElement,
  type SlackRichTextInline,
} from '@elastic/isomer-sdk/slack';
import { describe, expect, it } from 'vitest';

import { slackCaption } from './children';
import { marksRichText, richTextRun } from './marks';
import {
  mrkdwnKeeps,
  richTextLinked,
  richTextSection,
  slackCodePanel,
  slackContext,
  slackFields,
  slackHeading,
  slackMarksContext,
  slackMarksSection,
  slackRichText,
  slackSection,
} from './slack_text';

describe('mrkdwnKeeps', () => {
  it.each(['*', '_', '~', '`'])('refuses plain text holding %s', (mark) => {
    expect(mrkdwnKeeps([`a ${mark} b`])).toBe(false);
    expect(mrkdwnKeeps(['a b'])).toBe(true);
  });

  it('reads marks text by run', () => {
    expect(mrkdwnKeeps([{ marks: 'a **b** `c`' }])).toBe(true);
    expect(mrkdwnKeeps([{ marks: 'a **b_c**' }])).toBe(false);
    expect(mrkdwnKeeps([{ marks: 'a `<b>`' }])).toBe(false);
    expect(mrkdwnKeeps([{ marks: 'a `&amp;`' }])).toBe(false);
  });

  it.each(['echo ```', 'if a <b> then', 'x &amp; y', 'a &lt; b'])(
    'refuses code %j, which a code block would change',
    (code) => {
      expect(mrkdwnKeeps([{ code }])).toBe(false);
    }
  );

  it('keeps code a code block prints as written', () => {
    expect(mrkdwnKeeps([{ code: 'a => b > c && d *e* _f_' }])).toBe(true);
  });

  it('reads a long input in linear time', () => {
    const started = performance.now();
    expect(mrkdwnKeeps([{ code: `${'&amp'.repeat(100_000)}\`` }])).toBe(true);
    expect(mrkdwnKeeps(['x'.repeat(100_000)])).toBe(true);
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});

describe('rich text fallbacks past a section', () => {
  const max = SLACK_LIMITS.sectionTextChars;
  const href = 'https://example.com/docs';
  const url = slackLinkUrl(href);
  const x = (length: number) => 'x'.repeat(length);

  const inlineText = (inline: SlackRichTextInline): string =>
    inline.type === 'link' ? (inline.text ?? inline.url) : inline.text;

  const elementText = (element: SlackRichTextBlockElement): string =>
    element.type === 'rich_text_list'
      ? ''
      : element.elements.map(inlineText).join('');

  /** The block's elements once the Slack envelope has fitted it. */
  const elementsOf = (block: SlackBlock): SlackRichTextBlockElement[] => {
    const [fitted] = renderSlackEnvelope(
      { type: 'view', body: [{ type: 'node' }] },
      {
        renderText: () => '',
        renderMarkdown: () => '',
        renderSlack: () => [block],
      }
    ).blocks;
    return fitted?.type === 'rich_text' ? fitted.elements : [];
  };

  // Plain text holds a `_`, which `mrkdwn` would read as italics, so each helper falls back.
  const plain = (length: number) => `_${x(length - 1)}`;
  const marked = (length: number) => ({
    marks: `_ **${x(length - 4)}** \`c\``,
    text: `_ ${x(length - 4)} c`,
  });
  const linked = (length: number) => () =>
    slackRichText(
      richTextSection(...richTextLinked([richTextRun(x(length))], href))
    );

  const cases: [string, (length: number) => [SlackBlock, string]][] = [
    ['slackHeading plain', (n) => [slackHeading(x(n)), x(n)]],
    [
      'slackHeading marked',
      (n) => {
        const { marks, text } = marked(n);
        return [slackHeading(text, marksRichText(marks)), text];
      },
    ],
    ['slackMarksSection plain', (n) => [slackMarksSection(plain(n)), plain(n)]],
    [
      'slackMarksSection marked',
      (n) => [slackMarksSection(marked(n).marks), marked(n).text],
    ],
    ['slackMarksContext plain', (n) => [slackMarksContext(plain(n)), plain(n)]],
    [
      'slackMarksContext marked',
      (n) => [slackMarksContext(marked(n).marks), marked(n).text],
    ],
    ['slackCaption plain', (n) => [slackCaption(plain(n)), plain(n)]],
    ['slackCaption strong', (n) => [slackCaption(plain(n), true), plain(n)]],
    ['slackSection link', (n) => [slackSection('', linked(n), ['_']), x(n)]],
    ['slackContext link', (n) => [slackContext('', linked(n), ['_']), x(n)]],
    ['slackFields link', (n) => [slackFields([''], linked(n), ['_']), x(n)]],
    [
      'slackCodePanel code',
      (n) => [slackCodePanel(`<\n${x(n - 2)}`), `<\n${x(n - 2)}`],
    ],
  ];

  it.each(
    cases.flatMap(([name, build]) =>
      [max, max + 1, 10_000].map((length) => [name, length, build] as const)
    )
  )('%s at %i characters', (_name, length, build) => {
    const [block, text] = build(length);
    const elements = elementsOf(block);
    expect(elements).toHaveLength(Math.ceil(length / max));
    expect(new Set(elements.map(({ type }) => type)).size).toBe(1);
    for (const element of elements) {
      expect(elementText(element).length).toBeLessThanOrEqual(max);
    }
    expect(elements.map(elementText).join('')).toBe(text);
  });

  it('keeps each piece of a split link on its URL', () => {
    const elements = elementsOf(linked(10_000)());
    const inlines = elements.flatMap((element) =>
      element.type === 'rich_text_list' ? [] : element.elements
    );
    expect(inlines.every((inline) => inline.type === 'link')).toBe(true);
    expect(
      inlines.every((inline) => inline.type === 'link' && inline.url === url)
    ).toBe(true);
  });

  it('keeps the style of a marked run across the split', () => {
    const block = slackMarksSection(marked(10_000).marks);
    const bold = elementsOf(block)
      .flatMap((element) =>
        element.type === 'rich_text_list' ? [] : element.elements
      )
      .filter(({ text }) => text?.startsWith('x'));
    expect(bold.length).toBeGreaterThan(1);
    expect(bold.every(({ style }) => style?.bold === true)).toBe(true);
  });

  it('keeps a caption above split code', () => {
    const [caption, ...code] = elementsOf(
      slackCodePanel(`<${x(max)}`, 'order.ts')
    );
    expect(caption?.type).toBe('rich_text_section');
    expect(code.map(({ type }) => type)).toEqual([
      'rich_text_preformatted',
      'rich_text_preformatted',
    ]);
  });
});
