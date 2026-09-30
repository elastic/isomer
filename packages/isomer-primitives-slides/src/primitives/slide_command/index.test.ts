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
  commandMaxColumns,
} from '../../theme/components/command';
import { frameContentWidth } from '../../theme/components/frame';
import { marks as marksTheme } from '../../theme/components/marks';
import { type SlideSize, slideSizes } from '../../theme/variants';
import { authoredTextMaxLength } from '../authored_text';
import { renderedStep } from '../size.fixtures';
import { paneWidths } from '../slide_split/pane_layout';
import type { SlideSplitNode } from '../slide_split/types';

import { COPY_BUTTON_ATTRIBUTE, SLIDE_COPY } from './copy';
import { example, examples, highlightExample, longExample } from './examples';
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
    const wide = '漢'.repeat(Math.floor(commandMaxColumns / 2));
    expect(errorPaths(commandOf(wide))).toEqual([]);
    expect(errorPaths(commandOf(`${wide}漢x`))).toEqual([
      `body[0].body[0].command: wider than the slide: at most ${commandMaxColumns} columns, a wide glyph counting as two`,
    ]);
  });

  it('takes the widest command a full-width slide holds and rejects one more column', () => {
    const longest = 'x'.repeat(commandMaxColumns);
    expect(errorPaths(commandOf(longest))).toEqual([]);
    expect(errorPaths(commandOf(`${longest}x`))).toHaveLength(1);
    expect(commandSize(longest)).toBe('s');
    expect(commandWidth(longest, 's')).toBeLessThanOrEqual(commandLineWidth());
  });

  it('pins the long example at the widest command', () => {
    expect(longExample.command).toHaveLength(commandMaxColumns);
  });

  it('measures a command at the input-size guard and refuses one past it unmeasured', () => {
    expect(errorPaths(commandOf('x'.repeat(authoredTextMaxLength)))).toEqual([
      expect.stringMatching(/command: wider than the slide/),
    ]);
    expect(
      errorPaths({
        ...commandOf(`\t${'x'.repeat(authoredTextMaxLength)}\n`),
        highlightPrefix: 'y',
      })
    ).toEqual([
      `body[0].body[0].command: must be at most ${authoredTextMaxLength} characters`,
    ]);
  });
});

describe('slideCommand sizing', () => {
  const [pane] = paneWidths(frameContentWidth, 'even', 'gap');
  const inPane = (node: SlideCommandNode): SlideSplitNode => ({
    type: 'slideSplit',
    panes: [
      { items: [node] },
      { items: [{ type: 'slideBulletList', items: ['One'] }] },
    ],
  });
  /** The most `x`s that fit at `size` across `width`. */
  const most = (size: SlideSize, width?: number) => {
    let length = 0;
    while (
      commandWidth('x'.repeat(length + 1), size) <= commandLineWidth(width)
    ) {
      length += 1;
    }
    return length;
  };

  it('takes the largest step a short command fits', () => {
    expect(commandSize(example.command)).toBe('l');
  });

  it('measures every space, as the line keeps them', () => {
    expect(commandWidth(' echo  "a    b" ', 'l')).toBe(
      commandWidth('xechoxx"axxxxb"x', 'l')
    );
  });

  it.each([
    ['a full-width slide', undefined, (node: SlideCommandNode) => node],
    ['a split pane', pane, inPane],
  ] as const)(
    'steps down at each step boundary across %s',
    (_name, width, place) => {
      for (const [index, size] of slideSizes.slice(0, -1).entries()) {
        const next = slideSizes[index + 1];
        const fits = 'x'.repeat(most(size, width));
        expect(commandSize(fits, width)).toBe(size);
        expect(commandSize(`${fits}x`, width)).toBe(next);
        expect(renderedStep('command-textSize', place(commandOf(fits)))).toBe(
          size
        );
        expect(
          renderedStep('command-textSize', place(commandOf(`${fits}x`)))
        ).toBe(next);
      }
    }
  );

  it('draws the widest command a pane holds at the smallest step inside its panel', async () => {
    const takumi = createTakumiImageBackend({ fonts: slideFonts });
    const command = 'x'.repeat(most('s', pane));
    const layout = await takumi.measure(
      runtime.surfaces.svg.render(compose(inPane(commandOf(command))), {
        anchors: true,
      })
    );
    const boxes = (box: LayoutBox): LayoutBox[] => [
      box,
      ...box.children.flatMap(boxes),
    ];
    const root = boxes(layout).find(
      ({ attributes }) => attributes?.[NODE_ANCHOR_ATTRIBUTE] === 'slideCommand'
    )!;
    const drawn = boxes(root)
      .flatMap(({ runs }) => runs)
      .reduce((total, { width }) => total + width, 0);
    expect(root.width).toBeLessThanOrEqual(pane + 1);
    expect(drawn).toBeLessThanOrEqual(commandLineWidth(pane));
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

describe('slideCommand in Slack past a section', () => {
  it('keeps a long label and the command whole in rich text', () => {
    const label = '&'.repeat(3000);
    expect(slack({ ...example, label })).toEqual([
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_section',
            elements: [{ type: 'text', text: label, style: { bold: true } }],
          },
          {
            type: 'rich_text_preformatted',
            elements: [{ type: 'text', text: example.command }],
          },
        ],
      },
    ]);
  });
});

describe('slideCommand in the DOM', () => {
  it('marks the highlight in markup and in weight, not color alone', () => {
    const { html, css } = runtime.surfaces.html.render(
      compose(highlightExample),
      { css: 'separate' }
    );
    const [, name = ''] =
      /<mark class="([^"]+)">REGION=eu-west-1<\/mark>/.exec(html) ?? [];
    expect(name).not.toBe('');
    expect(css).toMatch(
      new RegExp(
        `\\.${name.split(' ').at(-1)}\\{[^}]*font-weight:${marksTheme.strong.weight.value}`
      )
    );
  });

  it('keeps the label apart from the command in the text', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html.replace(/<[^>]+>/g, '')).toContain(
      `${example.label} $ ${example.command}`
    );
  });
});

describe('slideCommand at its bound', () => {
  const takumi = createTakumiImageBackend({ fonts: slideFonts });
  const descendants = (box: LayoutBox): LayoutBox[] =>
    box.children.flatMap((child) => [child, ...descendants(child)]);

  it.each([
    ['narrow', 'x'.repeat(commandMaxColumns)],
    ['wide', '漢'.repeat(Math.floor(commandMaxColumns / 2))],
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
      expect(drawn).toBeLessThanOrEqual(commandLineWidth());
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
