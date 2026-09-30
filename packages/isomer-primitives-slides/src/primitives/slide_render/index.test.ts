/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { createElement } from 'react';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  type Composition,
  createChildNodeWalker,
  findNodeElementPairs,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { slideJsx } from '../../jsx';
import { slideDeckFrame, slidesPack } from '../../pack';
import { slideDeckPrimitives } from '../../registry';
import { render } from '../../theme/components/render';
import { statementFit } from '../../theme/components/statement';
import { openBody } from '../layout';
import { renderedStep } from '../size.fixtures';
import { example as annotatedExample } from '../slide_annotated_render/examples';
import { example as gridExample } from '../slide_render_grid/examples';

import {
  bareExample,
  example,
  examples,
  markdownExample,
  placeholderExample,
} from './examples';
import { captionHeight, renderScale } from './fit';
import { headline } from './output';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (...body: object[]): Composition => ({
  type: 'view',
  body: [
    {
      type: 'slideFrame',
      body: [{ type: 'slideHeading', title: 'Host' }, ...body],
    } as PrimitiveNode,
  ],
});

const heading = { type: 'slideHeading', title: 'Embedded' };

const errorsOf = (node: object) =>
  runtime
    .validate(compose(node))
    .errors.map(({ path, message }) => `${path}: ${message}`);

describe('slideRender schema', () => {
  it('needs a slide reference or a body', () => {
    expect(errorsOf({ type: 'slideRender', surface: 'svg' })).toEqual([
      'body[0].body[1].body: needs a `slide` reference or a `body`',
    ]);
    expect(errorsOf(placeholderExample)).toEqual([]);
    expect(
      JSON.stringify(
        z.toJSONSchema(
          slideDeckPrimitives.find(({ type }) => type === 'slideRender')!.schema
        )
      )
    ).toContain('A render needs `slide`, `body`, or both.');
  });

  it('embeds whole slides, but never another render', () => {
    expect(errorsOf(example)).toEqual([]);
    expect(
      errorsOf({
        ...bareExample,
        body: [{ type: 'slideStack', items: [placeholderExample] }],
      })
    ).toContainEqual(
      'body[0].body[1].body[0].items[0]: an embedded body cannot hold another render'
    );
  });

  it.each(['slideRender', 'slideRenderGrid'] as const)(
    'takes a %s body of one frame alone, or of loose nodes',
    (type) => {
      const withBody = (body: object[]) =>
        type === 'slideRender'
          ? { type, surface: 'svg', body }
          : {
              type,
              body,
              tiles: [
                { surface: 'svg', caption: 'A' },
                { surface: 'text', caption: 'B' },
              ],
            };
      const lone = { type: 'slideFrame', body: [heading] };
      const rule = 'a slideFrame must be the only node of an embedded body';
      expect(errorsOf(withBody([lone]))).toEqual([]);
      expect(errorsOf(withBody([heading, heading]))).toEqual([]);
      expect(errorsOf(withBody([lone, heading]))).toEqual([
        `body[0].body[1].body[0]: ${rule}`,
      ]);
      expect(errorsOf(withBody([lone, lone]))).toEqual([
        `body[0].body[1].body[0]: ${rule}`,
        `body[0].body[1].body[1]: ${rule}`,
      ]);
      const schema = slideDeckPrimitives.find(
        (entry) => entry.type === type
      )!.schema;
      expect(JSON.stringify(z.toJSONSchema(schema))).toContain(
        'One `slideFrame` alone'
      );
    }
  );

  it('keeps embedded ids its own', () => {
    const heading = { type: 'slideHeading', id: 'same', title: 'Twice' };
    expect(
      errorsOf({ type: 'slideRender', surface: 'svg', body: [heading] })
    ).toEqual([]);
    expect(
      runtime.validate(
        compose(heading, {
          type: 'slideRender',
          surface: 'svg',
          body: [heading],
        })
      ).errors
    ).toEqual([]);
  });
});

describe('slideRender layout', () => {
  it('draws the slide no larger than its cap, its layout’s width, or the room under its caption', () => {
    const short = {
      type: 'slideRender',
      surface: 'svg',
      slide: 'next',
    } as const;
    expect(renderScale(short, openBody)).toBe(
      parseFloat(render.maxScale.value)
    );
    expect(renderScale(short, { width: 500, height: 900 })).toBeCloseTo(
      500 / 1920
    );
    expect(renderScale(short, { width: 1600, height: 300 })).toBeCloseTo(
      (300 - captionHeight(headline(short), 1600)) / 1080
    );
  });

  it('fits the slide under a caption wrapped across the layout, at any length that leaves room', () => {
    const room = { width: 1000, height: 460 };
    for (const caption of [
      'The delivery slide '.repeat(16).trim(),
      'delivery-times-'.repeat(20),
    ]) {
      const node = { type: 'slideRender', surface: 'svg', caption } as const;
      const scale = renderScale(node, room);
      expect(
        scale * 1080 + captionHeight(headline(node), room.width)
      ).toBeLessThanOrEqual(room.height);
    }
  });

  it('leaves room for a caption that wraps', () => {
    const short = {
      type: 'slideRender',
      surface: 'svg',
      slide: 'next',
    } as const;
    const long = { ...short, caption: 'The delivery slide, '.repeat(6) };
    const room = { width: 1000, height: 400 };
    expect(captionHeight(headline(long), 600)).toBeGreaterThan(
      captionHeight(headline(short), 600)
    );
    expect(renderScale(long, room)).toBeLessThan(renderScale(short, room));
  });

  it('lays out an embedded slide on a fresh full slide, wherever the render sits', () => {
    const statement = {
      type: 'slideStatement',
      text: 'x'.repeat(statementFit.l + 1),
    };
    const alone = renderedStep('statement-textSize', statement);
    const inPane = (node: object) =>
      renderedStep('statement-textSize', {
        type: 'slideSplit',
        panes: [
          { items: [node] },
          { items: [{ type: 'slideBulletList', items: ['Beside'] }] },
        ],
      });
    const embedded = (body: object[]) =>
      inPane({ type: 'slideRender', surface: 'svg', body });
    expect(alone).toBe('l');
    expect(inPane(statement)).not.toBe(alone);
    expect(embedded([statement])).toBe(alone);
    expect(embedded([{ type: 'slideFrame', body: [statement] }])).toBe(alone);
    expect(
      embedded([{ type: 'slideHeading', title: 'Embedded' }, statement])
    ).toBe(
      renderedStep('statement-textSize', statement, {
        type: 'slideHeading',
        title: 'Embedded',
      })
    );
  });
});

describe('slideRender anchors', () => {
  const walk = createChildNodeWalker(slideDeckPrimitives);

  it.each(
    [...examples, gridExample, annotatedExample].map((node) => [
      node.type,
      node,
    ])
  )(
    'pairs every host node beside a %s, and nothing embedded',
    (_type, node) => {
      const composition = compose(node, {
        type: 'slideBulletList',
        items: ['After'],
      });
      document.body.innerHTML = runtime.surfaces.html.render(composition, {
        anchors: true,
      }).html;
      const pairs = findNodeElementPairs(document.body, composition.body, walk);
      expect(pairs.every(({ element }) => element !== undefined)).toBe(true);
    }
  );
});

describe('slideRender output', () => {
  it('quotes a drawn slide and prints another surface’s output', () => {
    expect(runtime.surfaces.markdown.renderNode(example))
      .toMatchInlineSnapshot(`
      "_The delivery slide, from the svg surface · delivery-times · svg_

      > # Orders now arrive in under 30 minutes
      >
      > Routing from the nearest store cut the median wait by eleven minutes.
      >
      > _Basket · 02 Operations_"
    `);
    expect(runtime.surfaces.markdown.renderNode(markdownExample))
      .toMatchInlineSnapshot(`
        "_The delivery slide, as Markdown · markdown_

        \`\`\`
        # Orders now arrive in under 30 minutes

        Routing from the nearest store cut the median wait by eleven minutes.

        _Basket · 02 Operations_
        \`\`\`"
      `);
    expect(runtime.surfaces.text.renderNode(placeholderExample)).toBe(
      'The weekly summary, from the svg surface · weekly-summary · svg'
    );
  });

  it('keeps one Slack header, turning an embedded one into a bold section', () => {
    const blocks = runtime.surfaces.slack.render(compose(example)).blocks;
    expect(blocks.filter(({ type }) => type === 'header')).toHaveLength(1);
    expect(blocks).toContainEqual({
      type: 'section',
      text: { type: 'mrkdwn', text: '*Orders now arrive in under 30 minutes*' },
    });
  });

  it('keeps an embedded header’s formatting characters as authored', () => {
    const title = 'Ship *a* <b>';
    const node = {
      type: 'slideRender',
      surface: 'svg',
      body: [{ ...heading, title }],
    };
    expect(runtime.surfaces.slack.renderNode(node).blocks).toContainEqual({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [{ type: 'text', text: title, style: { bold: true } }],
        },
      ],
    });
  });
});

describe('slideRender blank lines', () => {
  const code = {
    type: 'slideCode',
    panels: [{ file: 'a.ts', lines: ['const a = 1;', '', 'const b = 2;'] }],
  };
  const node = { type: 'slideRender', surface: 'text', body: [code] };

  it('keeps a blank line inside the output in its panel and every preview', () => {
    const { html } = runtime.surfaces.html.render(compose(node));
    const lines = [
      ...html.matchAll(/class="[^"]*render-line[^"]*">([^<]*)</g),
    ].map(([, line]) => line);
    expect(lines).toEqual(['a.ts', 'const a = 1;', '', 'const b = 2;']);
    expect(runtime.surfaces.text.renderNode(node)).toContain(
      'const a = 1;\n\n  const b = 2;'
    );
    expect(runtime.surfaces.markdown.renderNode(node)).toContain(
      'const a = 1;\n\nconst b = 2;'
    );
    expect(JSON.stringify(runtime.surfaces.slack.renderNode(node))).toContain(
      'const a = 1;\\n\\nconst b = 2;'
    );
  });
});

describe('slideRender JSX', () => {
  it('takes its body as a prop of elements', () => {
    const {
      Composition: View,
      SlideHeading,
      SlideRender,
      toComposition,
    } = slideJsx;
    const composition = toComposition(
      createElement(
        View,
        null,
        createElement(SlideRender, {
          surface: 'svg',
          body: [createElement(SlideHeading, { title: 'Embedded' })],
        })
      )
    );
    expect(composition.body[0]).toEqual({
      type: 'slideRender',
      surface: 'svg',
      body: [{ type: 'slideHeading', title: 'Embedded' }],
    });
  });

  it.each(['SlideRender', 'SlideRenderGrid'] as const)(
    'refuses embedded slides passed to <%s> as children',
    (name) => {
      const { Composition: View, SlideHeading, toComposition } = slideJsx;
      expect(() =>
        toComposition(
          createElement(
            View,
            null,
            createElement(
              slideJsx[name],
              { surface: 'svg', tiles: [] },
              createElement(SlideHeading, { title: 'Embedded' })
            )
          )
        )
      ).toThrow(`<${name}> takes no JSX children`);
    }
  );
});
