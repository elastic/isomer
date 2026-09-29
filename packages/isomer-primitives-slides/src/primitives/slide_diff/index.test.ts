/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createTakumiImageBackend } from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  type LayoutBox,
  NODE_ANCHOR_ATTRIBUTE,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slideFonts } from '../../examples/fonts';
import { previewSlide } from '../../examples/preview_slide';
import { slideDeckFrame, slidesPack } from '../../pack';
import { codeDenseAfter } from '../../theme/components/code';
import {
  diff,
  diffLineMaxLength,
  diffMaxLines,
} from '../../theme/components/diff';
import { slideDistillery } from '../../theme/distillery';
import { scalePx } from '../../theme/scale';

import { configExample, example, examples } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema, type SlideDiffLine, type SlideDiffNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const markdown = (node: SlideDiffNode): string =>
  serializeMarkdown(markdownContent(node));

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const diffOf = (lines: SlideDiffLine[], file?: string): SlideDiffNode => ({
  type: 'slideDiff',
  ...(file ? { file } : {}),
  lines,
});

const errorPaths = (node: unknown) =>
  runtime
    .validate(compose(node as PrimitiveNode))
    .errors.map(({ path, message }) => `${path}: ${message}`);

const { marker, markerLabel } = slideDistillery.tokens.diff;

describe('slideDiff schema', () => {
  it(`holds one to ${diffMaxLines} lines`, () => {
    expect(schema.safeParse(diffOf([])).success).toBe(false);
    expect(
      schema.safeParse(
        diffOf(Array<SlideDiffLine>(diffMaxLines + 1).fill({ text: 'x' }))
      ).success
    ).toBe(false);
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
  });

  it.each(['\n', '\r', ' ', ' '].map((mark) => [JSON.stringify(mark), mark]))(
    'rejects an entry split by %s',
    (_name, mark) => {
      expect(errorPaths(diffOf([{ text: `one${mark}two` }]))).toEqual([
        'body[0].body[0].lines: one line per entry: split multi-line source into separate lines',
      ]);
    }
  );

  it('rejects a tab, whose width depends on the renderer', () => {
    expect(errorPaths(diffOf([{ text: '\tindented' }]))).toEqual([
      'body[0].body[0].lines: indent with spaces, not tabs',
    ]);
  });

  it('takes a line that fills the panel and reports the limit past it', () => {
    const regular = diffLineMaxLength(false);
    expect(errorPaths(diffOf([{ text: 'x'.repeat(regular) }]))).toEqual([]);
    expect(errorPaths(diffOf([{ text: 'x'.repeat(regular + 1) }]))).toEqual([
      `body[0].body[0].lines: a line is wider than its panel: at most ${regular} columns, a wide glyph counting as two`,
    ]);
    const dense = diffLineMaxLength(true);
    expect(
      errorPaths(
        diffOf([
          { text: 'x'.repeat(dense + 1) },
          ...Array<SlideDiffLine>(codeDenseAfter).fill({ text: 'y' }),
        ])
      )
    ).toEqual([
      `body[0].body[0].lines: a line is wider than its panel: at most ${dense} columns once there are more than ${codeDenseAfter} lines, a wide glyph counting as two`,
    ]);
  });

  it('counts a wide glyph as two columns', () => {
    const wide = '漢'.repeat(Math.floor(diffLineMaxLength(false) / 2));
    expect(errorPaths(diffOf([{ text: wide }]))).toEqual([]);
    expect(errorPaths(diffOf([{ text: `${wide}漢` }]))).toHaveLength(1);
  });
});

describe('slideDiff output', () => {
  it('prefixes each line in text with the marker the slide draws', () => {
    expect(text(example).split('\n')).toEqual([
      'refund.ts · before and after',
      ' export const refund = async (order: Order) => {',
      '-  await fraud.check(order);',
      '   await ledger.write(order.id, -order.total);',
      '+  await fraud.check(order);',
      '   return notify(order.customer);',
      ' };',
    ]);
  });

  it('fences the lines as diff in markdown', () => {
    expect(markdown(configExample).split('\n')).toEqual([
      '```diff',
      ' checkout:',
      '-  timeout: 30s',
      '+  timeout: 10s',
      '+  retries: 3',
      ' ',
      '   currency: EUR',
      '```',
    ]);
  });

  it('keeps a whitespace-only change visible', () => {
    expect(
      text(
        diffOf([
          { text: 'total: 3 ', op: 'remove' },
          { text: 'total: 3', op: 'add' },
        ])
      ).split('\n')
    ).toEqual(['-total: 3 ', '+total: 3']);
  });

  it('lengthens the fence past a backtick run in a line', () => {
    expect(markdown(diffOf([{ text: '```js', op: 'add' }]))).toMatch(
      /^````diff\n/
    );
  });

  it('puts the lines in a Slack code block under the caption', () => {
    expect(slack(example)).toEqual([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `refund.ts · before and after\n\`\`\`\n${text({ ...example, file: undefined })}\n\`\`\``,
        },
      },
    ]);
  });
});

describe('slideDiff in the DOM', () => {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
  };
  const panelOf = (node: SlideDiffNode) =>
    /<pre[^>]*>([\s\S]*?)<\/pre>/.exec(
      runtime.surfaces.html.render(compose(node)).html
    )?.[1] ?? '';
  const textOf = (html: string) =>
    html
      .replace(/<[^>]+>/g, '')
      .replace(
        /&(?:amp|lt|gt|quot|#x27);/g,
        (entity) => entities[entity] ?? entity
      );

  it.each(examples.map((node, index) => [index, node] as const))(
    'example %i reads as its unified form, blank lines too',
    (_index, node) => {
      expect(textOf(panelOf(node))).toBe(text({ ...node, file: undefined }));
    }
  );

  it.each(examples.map((node, index) => [index, node] as const))(
    'example %i marks each change in words and markup, not color alone',
    (_index, node) => {
      const html = panelOf(node);
      const count = (op: SlideDiffLine['op']) =>
        node.lines.filter((line) => line.op === op).length;
      for (const op of ['add', 'remove'] as const) {
        expect(
          html.split(`role="img" aria-label="${markerLabel[op].value}"`)
            .length - 1
        ).toBe(count(op));
      }
      expect(html.match(/<ins[\s>]/g)?.length ?? 0).toBe(count('add'));
      expect(html.match(/<del[\s>]/g)?.length ?? 0).toBe(count('remove'));
    }
  );

  it('draws the marker glyph the text surface prints', () => {
    const html = panelOf(example);
    expect(html).toContain(`>${marker.add.value}</span>`);
    expect(html).toContain(`>${marker.remove.value}</span>`);
  });
});

describe('slideDiff at its bounds', () => {
  const takumi = createTakumiImageBackend({ fonts: slideFonts });
  const descendants = (box: LayoutBox): LayoutBox[] =>
    box.children.flatMap((child) => [child, ...descendants(child)]);
  const anchored = (box: LayoutBox, type: string) =>
    [box, ...descendants(box)].find(
      ({ attributes }) => attributes?.[NODE_ANCHOR_ATTRIBUTE] === type
    )!;
  const tolerance = 1;

  it.each([
    ['regular', codeDenseAfter, diffLineMaxLength(false)],
    ['dense', diffMaxLines, diffLineMaxLength(true)],
  ])(
    'draws the most %s lines a panel holds under a heading, unclipped',
    async (_name, count, width) => {
      const node = diffOf(
        Array.from({ length: count }, (_, index) => ({
          text: 'x'.repeat(width),
          ...(index % 3 === 0 ? { op: 'add' as const } : {}),
        })),
        'order.json · after the refund'
      );
      const layout = await takumi.measure(
        runtime.surfaces.svg.render(previewSlide(node), { anchors: true })
      );
      const body = anchored(layout, 'slideFrame').children[0]!.children[0]!;
      const root = anchored(layout, 'slideDiff');
      const textEnd = root.x + root.width - scalePx(diff.paddingEnd);
      expect(
        descendants(root).filter(
          ({ y, height }) => y + height > body.y + body.height + tolerance
        )
      ).toEqual([]);
      expect(
        descendants(root)
          .flatMap(({ runs = [] }) => runs)
          .filter(({ x, width: run }) => x + run > textEnd + tolerance)
      ).toEqual([]);
    }
  );
});
