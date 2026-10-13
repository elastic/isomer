/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import {
  codeDenseAfter,
  codeLineMaxLength,
  codeMaxLines,
} from '../../theme/components/code';
import { frameContentWidth } from '../../theme/components/frame';
import { slideDistillery } from '../../theme/distillery';
import { panelHighlights } from '../slide_code/schema';
import { paneWidths } from '../slide_split_layout/pane_layout';

import { denseExample, example, examples } from './examples';
import { markdown as markdownContent, text } from './index';
import { schema, type SlideCodeTraceNode } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: PrimitiveNode): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const errorPaths = (node: unknown) =>
  runtime
    .validate(compose(node as PrimitiveNode))
    .errors.map(({ path, message }) => `${path}: ${message}`);

const pair = (left: string[], right: string[] = ['y']): SlideCodeTraceNode => ({
  type: 'slideCodeTrace',
  panels: [{ text: left.join('\n') }, { text: right.join('\n') }],
});

const widthError: unknown = expect.stringMatching(
  /^body\[0\]\.body\[0\]\.panels: a line is wider than its panel/
);

describe('slideCodeTrace schema', () => {
  it('holds exactly two panels of one to sixteen lines', () => {
    const [first] = example.panels;
    for (const panels of [[first], [first, first, first]]) {
      expect(schema.safeParse({ ...example, panels }).success).toBe(false);
    }
    expect(
      schema.safeParse(pair(Array<string>(codeMaxLines + 1).fill('x'))).success
    ).toBe(false);
    expect(examples.every((node) => schema.safeParse(node).success)).toBe(true);
    // The fit test measures it, so each panel holds the most lines a panel takes.
    for (const { text: source } of denseExample.panels) {
      expect(source.split('\n')).toHaveLength(codeMaxLines);
    }
  });

  it('rejects a highlight past the end of its panel, at that panel', () => {
    expect(
      errorPaths({
        ...example,
        panels: [
          example.panels[0],
          { text: 'one', lineNumbers: { highlight: '2' } },
        ],
      })
    ).toContainEqual(
      'body[0].body[0].panels[1].lineNumbers.highlight: each highlighted line must be a number the gutter shows'
    );
  });

  it('holds less in each of two panels than in one, and more once they are dense', () => {
    const two = codeLineMaxLength(2, false);
    expect(two).toBeLessThan(codeLineMaxLength(1, false));
    expect(errorPaths(pair(['x'.repeat(two)]))).toEqual([]);
    expect(errorPaths(pair(['x'.repeat(two + 1)]))).toContainEqual(widthError);
    const dense = codeLineMaxLength(2, true);
    expect(
      errorPaths(
        pair(Array<string>(codeDenseAfter + 1).fill('x'.repeat(dense)))
      )
    ).toEqual([]);
    expect(
      errorPaths(
        pair(
          ['x'.repeat(dense + 1)],
          Array<string>(codeDenseAfter + 1).fill('y')
        )
      )
    ).toContainEqual(
      `body[0].body[0].panels: a line is wider than its panel: at most ${dense} columns in each of two panels once a panel passes ${codeDenseAfter} lines, a wide glyph counting as two`
    );
  });

  it('measures each of two panels across the layout width', () => {
    const [pane] = paneWidths(frameContentWidth, 'even', 'gap');
    const density = (node: PrimitiveNode) =>
      /code-(dense|regular)/.exec(
        runtime.surfaces.html.render(compose(node)).html
      )?.[1];
    const two = codeLineMaxLength(2, false, frameContentWidth);
    expect(codeLineMaxLength(2, false, pane)).toBeLessThan(two);
    expect(density(pair(['x'.repeat(two)]))).toBe('regular');
  });
});

describe('slideCodeTrace output', () => {
  it('joins two panels with an arrow', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "config.yaml
      1  checkout:
      2    timeout: 30s
      3    retries: 3

      →

      client.ts
      41  const client = createClient({
      42    timeout: config.checkout.timeout,
      43    retries: config.checkout.retries,
      44  });"
    `);
    expect(serializeMarkdown(markdownContent(example))).toMatchInlineSnapshot(`
      "**config.yaml**

      \`\`\`yaml
      1  checkout:
      2    timeout: 30s
      3    retries: 3
      \`\`\`

      →

      **client.ts**

      \`\`\`ts
      41  const client = createClient({
      42    timeout: config.checkout.timeout,
      43    retries: config.checkout.retries,
      44  });
      \`\`\`"
    `);
  });

  it('names the arrow between the panels for assistive technology', () => {
    const { label } = slideDistillery.tokens.connector;
    expect(runtime.surfaces.html.render(compose(example)).html).toContain(
      `role="img" aria-label="${label.value}"`
    );
  });

  it.each(examples.map((node, index) => [index, node] as const))(
    'example %i marks every highlighted line in its panel',
    (_index, node) => {
      const { html } = runtime.surfaces.html.render(compose(node));
      expect(
        [...html.matchAll(/<pre[^>]*>([\s\S]*?)<\/pre>/g)].map(
          ([, inner = '']) => inner.match(/<mark[\s>]/g)?.length ?? 0
        )
      ).toEqual(node.panels.map((panel) => panelHighlights(panel).size));
    }
  );
});
