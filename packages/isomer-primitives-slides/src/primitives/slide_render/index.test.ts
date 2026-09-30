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

  it('leaves room for a caption that wraps at the drawn slide’s width', () => {
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
