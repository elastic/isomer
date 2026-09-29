/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import {
  createTakumiImageBackend,
  type LayoutBox,
} from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  NODE_ANCHOR_ATTRIBUTE,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slideFonts } from '../../examples/fonts';
import { previewSlide } from '../../examples/preview_slide';
import { slideDeckFrame, slidesPack } from '../../pack';
import {
  commandLineWidth,
  commandMaxLength,
} from '../../theme/components/command';

import { COPY_BUTTON_ATTRIBUTE, SLIDE_COPY } from './copy';
import { example, examples, highlightExample } from './examples';
import { commandSize, commandWidth } from './fit';
import { markdown as markdownContent, slack, text } from './index';
import type { SlideCommandNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const markdown = (node: SlideCommandNode): string =>
  serializeMarkdown(markdownContent(node));

const compose = (...nodes: unknown[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: nodes } as PrimitiveNode],
});

const errorPaths = (node: unknown) =>
  runtime
    .validate(compose(node))
    .errors.map(({ path, message }) => `${path}: ${message}`);

const commandOf = (command: string): SlideCommandNode => ({
  type: 'slideCommand',
  command,
});

describe('slideCommand schema', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(errorPaths(node)).toEqual([]);
    }
  });

  it.each(['\n', '\r', ' ', ' '].map((mark) => [JSON.stringify(mark), mark]))(
    'rejects a command split by %s',
    (_name, mark) => {
      expect(errorPaths(commandOf(`make${mark}make install`))).toEqual([
        'body[0].body[0].command: one line only: a multi-line command belongs in slideCode',
      ]);
    }
  );

  it('rejects a highlight that does not start the command', () => {
    expect(
      errorPaths({ ...highlightExample, highlightPrefix: 'npm run' })
    ).toEqual([
      'body[0].body[0].highlightPrefix: highlightPrefix must start command',
    ]);
  });

  it('rejects a tab, whose width depends on the renderer', () => {
    expect(errorPaths(commandOf('a\tb'))).toEqual([
      'body[0].body[0].command: separate words with spaces, not tabs',
    ]);
  });

  it('counts a wide glyph as two columns and reports the limit', () => {
    const wide = '漢'.repeat(Math.floor(commandMaxLength / 2));
    expect(errorPaths(commandOf(wide))).toEqual([]);
    expect(errorPaths(commandOf(`${wide}漢x`))).toEqual([
      `body[0].body[0].command: wider than the slide: at most ${commandMaxLength} columns, a wide glyph counting as two`,
    ]);
  });

  it('caps the command at a length that fits at the smallest step', () => {
    const longest = 'x'.repeat(commandMaxLength);
    expect(errorPaths(commandOf(longest))).toEqual([]);
    expect(errorPaths(commandOf(`${longest}x`))).toHaveLength(1);
    expect(commandSize(longest)).toBe('s');
    expect(commandWidth(longest, 's')).toBeLessThanOrEqual(commandLineWidth);
  });

  it('takes the largest step a short command fits', () => {
    expect(commandSize(example.command)).toBe('l');
  });
});

describe('slideCommand output', () => {
  it('prints the prompt in text', () => {
    expect(text(example)).toBe(
      'START THE LOCAL STORE\n$ docker compose up --detach inventory'
    );
  });

  it('fences the command without its prompt in markdown', () => {
    expect(markdown(example)).toBe(
      '**START THE LOCAL STORE**\n\n```sh\ndocker compose up --detach inventory\n```'
    );
  });

  it('lengthens the fence past a backtick run in the command', () => {
    expect(markdown(commandOf('echo ```'))).toMatch(/^````sh\necho ```\n````$/);
  });

  it('puts the command in a Slack code block under the label', () => {
    expect(slack(example)).toEqual([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*START THE LOCAL STORE*\n```\ndocker compose up --detach inventory\n```',
        },
      },
    ]);
  });
});

describe('slideCommand in the DOM', () => {
  it('keeps the label apart from the command in the text', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html.replace(/<[^>]+>/g, '')).toContain(
      `${example.label} $${example.command}`
    );
  });
});

describe('slideCommand at its bound', () => {
  const takumi = createTakumiImageBackend({ fonts: slideFonts });
  const descendants = (box: LayoutBox): LayoutBox[] =>
    box.children.flatMap((child) => [child, ...descendants(child)]);

  it.each([
    ['narrow', 'x'.repeat(commandMaxLength)],
    ['wide', '漢'.repeat(Math.floor(commandMaxLength / 2))],
  ])(
    'draws the longest %s command within the room left for the Copy chip',
    async (_name, command) => {
      const layout = await takumi.measure(
        runtime.surfaces.svg.render(previewSlide(commandOf(command)), {
          anchors: true,
        })
      );
      const root = [layout, ...descendants(layout)].find(
        ({ attributes }) =>
          attributes?.[NODE_ANCHOR_ATTRIBUTE] === 'slideCommand'
      )!;
      const drawn = descendants(root)
        .flatMap(({ runs }) => runs)
        .reduce((total, { width }) => total + width, 0);
      expect(drawn).toBeLessThanOrEqual(commandLineWidth);
    }
  );
});

describe('slideCopy', () => {
  const anchor = `${NODE_ANCHOR_ATTRIBUTE}="slideCommand"`;

  it('adds the anchor, the script, and the button style on the html surface when requested', () => {
    const { html, css, measurement } = runtime.surfaces.html.render(
      compose(example),
      { enhancements: [SLIDE_COPY], css: 'separate' }
    );
    expect(html).not.toContain('<button');
    expect(html).toContain(anchor);
    expect(css).toContain(`[${COPY_BUTTON_ATTRIBUTE}]`);
    expect(html).toContain('<script data-isomer-script');
    expect(measurement.js).toBeGreaterThan(0);
  });

  it('adds none of them without the request', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html).not.toContain(anchor);
    expect(html).not.toContain('<script');
  });

  it('ships no script to a composition without a command', () => {
    const { html } = runtime.surfaces.html.render(
      compose({ type: 'slideHeading', title: 'Nothing to copy' }),
      { enhancements: [SLIDE_COPY] }
    );
    expect(html).not.toContain('<script');
  });

  it('never draws the button on the svg surface', () => {
    const { element } = runtime.surfaces.svg.render(compose(example));
    expect(renderToStaticMarkup(element)).not.toContain('<button');
  });
});
