/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slideJsx } from '../../jsx';
import { slideDeckFrame, slidesPack } from '../../pack';
import { slideDistillery } from '../../theme/distillery';
import type { SlideFrameNode } from '../slide_frame';

import { example, examples, plainExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema, type SlideTranscriptNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const markdown = (node: SlideTranscriptNode): string =>
  serializeMarkdown(markdownContent(node));

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const { glyph, transcript } = slideDistillery.tokens;
const { roleLabel } = transcript;

describe('slideTranscript schema', () => {
  it('holds one to four turns', () => {
    const [first] = example.turns;
    expect(schema.safeParse({ ...example, turns: [] }).success).toBe(false);
    expect(
      schema.safeParse({ ...example, turns: Array(5).fill(first) }).success
    ).toBe(false);
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });
});

describe('slideTranscript examples', () => {
  it('pins an example at the most turns it holds', () => {
    expect(example.turns).toHaveLength(4);
  });
});

describe('slideTranscript in Slack past a section', () => {
  const past = 'x'.repeat(3001);
  const pieces = ['x'.repeat(3000), 'x'];

  it.each(['rich_text_section', 'rich_text_preformatted'] as const)(
    'splits a turn past a section into adjacent %s elements',
    (type) => {
      expect(
        slack({
          type: 'slideTranscript',
          turns: [
            {
              role: 'user',
              format: type === 'rich_text_section' ? 'prose' : 'code',
              text: past,
            },
          ],
        })
      ).toEqual([
        {
          type: 'rich_text',
          elements: [
            {
              type: 'rich_text_section',
              elements: [
                {
                  type: 'text',
                  text: roleLabel.user.value.toUpperCase(),
                  style: { bold: true },
                },
              ],
            },
            ...pieces.map((text) => ({
              type,
              elements: [{ type: 'text', text }],
            })),
          ],
        },
      ]);
    }
  );
});

describe('slideTranscript output', () => {
  it('prefixes each turn with its speaker in text', () => {
    expect(text(example).split('\n')).toEqual([
      'BOOKING A DELIVERY SLOT',
      'USER: Deliver my groceries tomorrow morning.',
      'MODEL: {"action":"book","window":"tomorrow"}',
      'HOST: window: expected a start and end time',
      'MODEL: {"action":"book","window":{"start":"08:00","end":"10:00"}}',
    ]);
  });

  it('keeps each line of a multi-line turn on its own line', () => {
    expect(text(plainExample).split('\n')).toEqual([
      'USER: Why did the nightly build fail?',
      'MODEL: The lockfile changed without a version bump.',
      'Run the install step again.',
    ]);
  });

  it.each([
    ['\\n', '\n'],
    ['\\r', '\r'],
    ['\\r\\n', '\r\n'],
    ['U+2028', ' '],
    ['U+2029', ' '],
  ])('breaks a prose turn at %s on every surface', (_name, terminator) => {
    const node: SlideTranscriptNode = {
      type: 'slideTranscript',
      turns: [{ role: 'model', text: `First line.${terminator}Second line.` }],
    };
    expect(text(node)).toBe('MODEL: First line.\nSecond line.');
    expect(markdown(node)).toBe('**MODEL**\n\nFirst line.\\\nSecond line.');
    expect(slack(node)).toEqual([
      {
        type: 'section',
        text: { type: 'mrkdwn', text: '*MODEL*\nFirst line.\nSecond line.' },
      },
    ]);
  });

  it('fences a code turn in markdown and Slack', () => {
    expect(markdown(example)).toContain(
      '**HOST**\n\n```text\nwindow: expected a start and end time\n```'
    );
    expect(slack(example)).toContainEqual({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: '*HOST*\n```\nwindow: expected a start and end time\n```',
      },
    });
  });

  it('sets each speaker in capitals from its theme label, as the slide draws it', () => {
    for (const { role } of example.turns) {
      const shown = roleLabel[role].value.toUpperCase();
      expect(text(example)).toContain(`${shown}${glyph.termJoiner.value}`);
      expect(markdown(example)).toContain(`**${shown}**`);
    }
  });

  it('sets the label in capitals, as the slide draws it', () => {
    expect(markdown(example)).toMatch(/^\*\*BOOKING A DELIVERY SLOT\*\*\n\n/);
    expect(slack(example)[0]).toEqual({
      type: 'context',
      elements: [{ type: 'mrkdwn', text: '*BOOKING A DELIVERY SLOT*' }],
    });
  });
});

describe('slideTranscript in the DOM', () => {
  const turnsOf = (node: SlideTranscriptNode) =>
    [
      ...runtime.surfaces.html
        .render(compose(node))
        .html.matchAll(/<li[^>]*>([\s\S]*?)<\/li>/g),
    ].map(([, inner = '']) =>
      inner.replace(/<[^>]+>/g, '').replace(/&quot;/g, '"')
    );

  it.each(examples.map((node, index) => [index, node] as const))(
    'example %i names each speaker and keeps each line in its text',
    (_index, node) => {
      expect(turnsOf(node)).toEqual(
        node.turns.map(
          ({ role, text: said }) => `${roleLabel[role].value} ${said}`
        )
      );
    }
  );

  it('announces each speaker: the role is text, not hidden from assistive technology', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    const list = /<ol[\s>][\s\S]*?<\/ol>/.exec(html)?.[0] ?? '';
    expect(list.match(/<li[\s>]/g)).toHaveLength(example.turns.length);
    expect(list).not.toContain('aria-hidden');
  });

  it('breaks a turn at any line terminator as at a newline', () => {
    expect(
      turnsOf({
        type: 'slideTranscript',
        turns: [{ role: 'host', text: 'one two\r\nthree' }],
      })
    ).toEqual([`${roleLabel.host.value} one\ntwo\nthree`]);
  });
});

describe('slideTranscript from JSX', () => {
  const { Composition, SlideFrame, SlideTranscript, SlideTurn, toComposition } =
    slideJsx;
  const turnsFrom = (...children: ReturnType<typeof createElement>[]) => {
    const composition = toComposition(
      createElement(
        Composition,
        null,
        createElement(
          SlideFrame,
          null,
          createElement(SlideTranscript, null, ...children)
        )
      )
    );
    const [frame] = composition.body as SlideFrameNode[];
    return (frame?.body[0] as SlideTranscriptNode).turns;
  };

  it('keeps the line breaks in a turn’s text children', () => {
    expect(
      turnsFrom(
        createElement(
          SlideTurn,
          { role: 'model' },
          'First line.\nSecond line.'
        ),
        createElement(
          SlideTurn,
          { role: 'host', format: 'code' },
          'a:  1\n',
          '  b: 2'
        )
      )
    ).toEqual([
      { role: 'model', text: 'First line.\nSecond line.' },
      { role: 'host', format: 'code', text: 'a:  1\n  b: 2' },
    ]);
  });

  it('takes a text prop over children', () => {
    expect(
      turnsFrom(createElement(SlideTurn, { role: 'user', text: 'Hi' }))
    ).toEqual([{ role: 'user', text: 'Hi' }]);
  });
});

describe('slideTranscript edge line breaks', () => {
  const surfacesOf = (said: string) => {
    const node: SlideTranscriptNode = {
      type: 'slideTranscript',
      turns: [{ role: 'model', text: said }],
    };
    return {
      text: text(node),
      markdown: markdown(node),
      slack: slack(node),
      react: renderToStaticMarkup(
        runtime.surfaces.react.render(compose(node))
      ).replace(/[\s\S]*<p[^>]*>([\s\S]*?)<\/p>[\s\S]*/, '$1'),
    };
  };
  const inner = surfacesOf('First line.\nSecond line.');

  it.each([
    ['leading', '\n\r\nFirst line.\nSecond line.'],
    ['trailing', 'First line.\nSecond line.\u2029 \n'],
    ['both', ' \nFirst line.\nSecond line.\n'],
  ])('drops %s blank lines on every surface alike', (_name, said) => {
    expect(
      schema.safeParse({
        type: 'slideTranscript',
        turns: [{ role: 'model', text: said }],
      }).success
    ).toBe(true);
    expect(surfacesOf(said)).toEqual(inner);
  });

  it.each(['\n', ' \r\n ', '\u2028'])(
    'rejects a turn with only blank lines: %j',
    (said) => {
      expect(
        runtime
          .validate(
            compose({
              type: 'slideTranscript',
              turns: [{ role: 'model', text: said }],
            } as PrimitiveNode)
          )
          .errors.map(({ path, message }) => `${path}: ${message}`)
      ).toEqual([
        'body[0].body[0].turns[0].text: a turn says something: text is blank',
      ]);
    }
  );
});
