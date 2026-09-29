/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTakumiImageBackend,
  type LayoutBox,
} from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slideFonts } from '../../examples/fonts';
import { slideDeckFrame, slidesPack } from '../../pack';
import {
  codeDenseAfter,
  codeLineMaxLength,
  codeMaxLines,
} from '../../theme/components/code';
import { slideDistillery } from '../../theme/distillery';

import {
  denseExample,
  denseTraceExample,
  example,
  examples,
  traceExample,
} from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema, type SlideCodeNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const markdown = (node: SlideCodeNode): string =>
  serializeMarkdown(markdownContent(node));

const takumi = createTakumiImageBackend({ fonts: slideFonts });

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const panel = (lines: string[], extra: object = {}): SlideCodeNode => ({
  type: 'slideCode',
  panels: [{ lines, ...extra }],
});

const errorPaths = (node: unknown) =>
  runtime
    .validate(compose(node as PrimitiveNode))
    .errors.map(({ path, message }) => `${path}: ${message}`);

describe('slideCode schema', () => {
  it('holds one or two panels of one to sixteen lines', () => {
    expect(schema.safeParse({ type: 'slideCode', panels: [] }).success).toBe(
      false
    );
    const [first] = traceExample.panels;
    expect(
      schema.safeParse({ ...traceExample, panels: [first, first, first] })
        .success
    ).toBe(false);
    expect(schema.safeParse(panel(Array<string>(17).fill('x'))).success).toBe(
      false
    );
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
    // The fit test measures these, so they hold the most lines a panel takes.
    for (const { panels } of [denseExample, denseTraceExample]) {
      for (const { lines } of panels) {
        expect(lines).toHaveLength(codeMaxLines);
      }
    }
  });

  it('rejects a highlight past the end of its panel, at that panel', () => {
    expect(
      errorPaths({
        ...traceExample,
        panels: [
          traceExample.panels[0],
          { lines: ['one'], highlightLines: [2] },
        ],
      })
    ).toContainEqual(
      'body[0].body[0].panels[1].highlightLines: highlightLines must exist in lines'
    );
  });

  it.each(
    ['\n', '\r', '\u2028', '\u2029'].map((mark) => [JSON.stringify(mark), mark])
  )('rejects an entry split by %s', (_name, mark) => {
    expect(errorPaths(panel([`one${mark}two`]))).toContainEqual(
      expect.stringMatching(
        /^body\[0\]\.body\[0\]\.panels\[0\]\.lines: one line per entry/
      )
    );
  });
});

describe('slideCode line width', () => {
  const widthError: unknown = expect.stringMatching(
    /^body\[0\]\.body\[0\]\.panels: a line is wider than its panel/
  );

  it('takes a line that fills one panel and rejects one that would be clipped', () => {
    const one = codeLineMaxLength(1, false);
    expect(errorPaths(panel(['x'.repeat(one)]))).toEqual([]);
    expect(errorPaths(panel(['x'.repeat(one + 1)]))).toContainEqual(widthError);
  });

  it('holds less in each of two panels, and more once they are dense', () => {
    const two = codeLineMaxLength(2, false);
    const pair = (line: string, count = 1): SlideCodeNode => ({
      type: 'slideCode',
      panels: [
        { lines: Array.from({ length: count }, () => line) },
        { lines: ['y'] },
      ],
    });
    expect(errorPaths(pair('x'.repeat(two)))).toEqual([]);
    expect(errorPaths(pair('x'.repeat(two + 1)))).toContainEqual(widthError);
    expect(
      errorPaths(
        pair('x'.repeat(codeLineMaxLength(2, true)), codeDenseAfter + 1)
      )
    ).toEqual([]);
  });

  it('reports the limit it applied', () => {
    const one = codeLineMaxLength(1, false);
    expect(errorPaths(panel(['x'.repeat(one + 1)]))).toContainEqual(
      `body[0].body[0].panels: a line is wider than its panel: at most ${one} columns in one panel, a wide glyph counting as two`
    );
    const dense = codeLineMaxLength(2, true);
    expect(
      errorPaths({
        type: 'slideCode',
        panels: [
          { lines: ['x'.repeat(dense + 1)] },
          { lines: Array<string>(codeDenseAfter + 1).fill('y') },
        ],
      })
    ).toContainEqual(
      `body[0].body[0].panels: a line is wider than its panel: at most ${dense} columns in each of two panels once a panel passes ${codeDenseAfter} lines, a wide glyph counting as two`
    );
  });

  it('counts a wide glyph as two columns and a combining mark as none', () => {
    const one = codeLineMaxLength(1, false);
    const wide = '漢'.repeat(Math.floor(one / 2));
    expect(errorPaths(panel([wide]))).toEqual([]);
    expect(errorPaths(panel([`${wide}漢`]))).toContainEqual(widthError);
    expect(errorPaths(panel(['e\u0301'.repeat(one)]))).toEqual([]);
  });

  it('refuses a line far past any panel before measuring it', () => {
    expect(errorPaths(panel(['x'.repeat(100_000)]))).toContainEqual(
      expect.stringMatching(
        /^body\[0\]\.body\[0\]\.panels\[0\]\.lines\[0\]: must be at most \d+ characters$/
      )
    );
  });

  it('rejects a tab, whose width depends on the renderer', () => {
    expect(errorPaths(panel(['\tindented']))).toEqual([
      'body[0].body[0].panels[0].lines: indent with spaces, not tabs',
    ]);
  });
});

describe('slideCode output', () => {
  it('renders text with the caption above the lines', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "refund.ts
      export const refund = async (order: Order) => {
        await ledger.write(order.id, -order.total);
        await fraud.check(order);
        return notify(order.customer);
      };"
    `);
  });

  it('joins two panels with an arrow', () => {
    expect(text(traceExample)).toMatchInlineSnapshot(`
      "config.yaml
      checkout:
        timeout: 30s
        retries: 3

      →

      client.ts
      const client = createClient({
        timeout: config.checkout.timeout,
        retries: config.checkout.retries,
      });"
    `);
    expect(markdown(traceExample)).toMatchInlineSnapshot(`
      "**config.yaml**

      \`\`\`yaml
      checkout:
        timeout: 30s
        retries: 3
      \`\`\`

      →

      **client.ts**

      \`\`\`ts
      const client = createClient({
        timeout: config.checkout.timeout,
        retries: config.checkout.retries,
      });
      \`\`\`"
    `);
  });

  it('renders a Slack code block per panel', () => {
    expect(slack(example)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "refund.ts
      \`\`\`
      export const refund = async (order: Order) => {
        await ledger.write(order.id, -order.total);
        await fraud.check(order);
        return notify(order.customer);
      };
      \`\`\`",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });

  it('drops a hostile language token', () => {
    expect(markdown(panel(['x'], { language: 'ts\n```\nmalicious' }))).toMatch(
      /^```\nx\n```$/
    );
  });

  it('lengthens the fence past a backtick run in the body', () => {
    const md = markdown(
      panel(['a ```js', 'console.log(1)', '``` b'], { language: 'md' })
    );
    expect(md).toMatch(/^````md\n/);
    expect(md.trim().endsWith('````')).toBe(true);
  });

  it('names the trace arrow between two panels for assistive technology', () => {
    const { label } = slideDistillery.tokens.connector;
    expect(runtime.surfaces.html.render(compose(traceExample)).html).toContain(
      `role="img" aria-label="${label.value}"`
    );
  });

  it('keeps a blank line empty in the markup and one line tall on the slide', async () => {
    const html = runtime.surfaces.html.render(
      compose(panel(['a', '', 'b']))
    ).html;
    expect(html).not.toContain('\u00a0');
    const yOf = async (lines: string[]) => {
      const box = await takumi.measure(
        runtime.surfaces.svg.render(compose(panel(lines)))
      );
      const runs = (node: LayoutBox): LayoutBox['runs'] => [
        ...node.runs,
        ...node.children.flatMap(runs),
      ];
      return runs(box).find(({ text }) => text.trim() === 'b')!.y;
    };
    // At both sizes: past `codeDenseAfter` lines the panel is dense.
    for (const lead of [[], Array<string>(codeDenseAfter).fill('z')]) {
      const [blank, none, filled] = await Promise.all([
        yOf([...lead, 'a', '', 'b']),
        yOf([...lead, 'a', 'b']),
        yOf([...lead, 'a', 'x', 'b']),
      ]);
      expect(blank).toBeGreaterThan(none);
      // A line box rounds its height; the blank line is within a pixel of a filled one.
      expect(Math.abs(blank - filled)).toBeLessThanOrEqual(1.5);
    }
  });
});

describe('slideCode in the DOM', () => {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
  };
  const panelsOf = (node: SlideCodeNode) =>
    [
      ...runtime.surfaces.html
        .render(compose(node))
        .html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g),
    ].map(([, inner = '']) => inner);
  const textOf = (html: string) =>
    html
      .replace(/<[^>]+>/g, '')
      .replace(
        /&(?:amp|lt|gt|quot|#x27);/g,
        (entity) => entities[entity] ?? entity
      );

  it.each(examples.map((node, index) => [index, node] as const))(
    'example %i keeps each line, blank ones too, in its text',
    (_index, node) => {
      expect(panelsOf(node).map(textOf)).toEqual(
        node.panels.map(({ lines }) => lines.join('\n'))
      );
    }
  );

  it.each(examples.map((node, index) => [index, node] as const))(
    'example %i marks every highlighted line',
    (_index, node) => {
      expect(
        panelsOf(node).map((html) => html.match(/<mark[\s>]/g)?.length ?? 0)
      ).toEqual(
        node.panels.map(({ highlightLines = [] }) => highlightLines.length)
      );
    }
  );
});
