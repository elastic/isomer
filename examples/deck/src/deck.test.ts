/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { runInThisContext } from 'node:vm';

import { createElement, type ReactElement } from 'react';
import type {
  SlideFrameNode,
  SlideSectionNode,
} from '@elastic/isomer-primitives-slides';
import {
  slideDeckPrimitives,
  slideJsx,
} from '@elastic/isomer-primitives-slides';
import { mapCompositionNodes, type PrimitiveNode } from '@elastic/isomer-sdk';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';

import { deck } from './deck';
import { runtime } from './runtime';
import * as shim from './shim';
import { slideCount } from './slide_count';
import { firstAttempt, secondAttempt } from './slides/14_agent';
import { addedSinceRedesign } from './slides/27_growth';
import { themes } from './viewer/surfaces';

const frameOf = ({ composition }: (typeof deck)[number]) =>
  composition.body[0] as SlideFrameNode;

/** A quote slide opens with the quotation, which has no heading of its own. */
const opensWithQuote = (slide: (typeof deck)[number]) =>
  frameOf(slide).body[0]?.type === 'slideQuote';

const sectionOf = (slide: (typeof deck)[number]) => {
  const [first] = frameOf(slide).body;
  return first?.type === 'slideSection' ? first : undefined;
};

const nodesOf = (slide: (typeof deck)[number]): PrimitiveNode[] => {
  const nodes: PrimitiveNode[] = [];
  mapCompositionNodes(slide.composition, slideDeckPrimitives, (node) => {
    nodes.push(node);
    return node;
  });
  return nodes;
};

describe('deck', () => {
  it('includes every slide file', () => {
    expect(deck).toHaveLength(slideCount);
  });

  it('gives every slide a unique slug', () => {
    const slugs = deck.map(({ slug }) => slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it.each(deck)('$slug renders on every surface', ({ composition }) => {
    expect(runtime.validate(composition).errors).toEqual([]);
    expect(runtime.surfaces.html.render(composition).validationErrors).toEqual(
      []
    );
    expect(runtime.surfaces.markdown.render(composition)).not.toBe('');
    expect(runtime.surfaces.text.render(composition)).not.toBe('');
    expect(runtime.surfaces.slack.render(composition).blocks).not.toEqual([]);
    for (const theme of themes) {
      expect(
        runtime.surfaces.svg.render(composition, { theme }).width
      ).toBeGreaterThan(0);
    }
  });

  it.each(deck)(
    '$slug shows the composition it draws as its JSON source',
    ({ composition, sources }) => {
      const json = sources.find(({ id }) => id === 'json');
      expect(JSON.parse(json?.text ?? 'null')).toEqual(composition);
    }
  );

  it('footers name the section each slide belongs to', () => {
    let current: SlideSectionNode | undefined;
    for (const slide of deck) {
      current = sectionOf(slide) ?? current;
      const { section, sectionNumber } = frameOf(slide);
      expect({ slug: slide.slug, section, sectionNumber }).toEqual({
        slug: slide.slug,
        section: current?.title,
        sectionNumber: current?.number,
      });
    }
  });

  it('sections list and link the slides that follow them', () => {
    deck.forEach((slide, index) => {
      const section = sectionOf(slide);
      if (!section) {
        return;
      }
      const next = deck.findIndex(
        (later, position) => position > index && sectionOf(later)
      );
      const owned = deck.slice(index + 1, next === -1 ? undefined : next);
      expect(section.contents).toEqual(
        owned.map(({ composition }) => composition.title)
      );
      expect(section.hrefs).toEqual(owned.map(({ slug }) => `?slide=${slug}`));
    });
  });

  it('opens every slide with one h1 in Markdown, as the viewer renders it', () => {
    for (const slide of deck.filter((entry) => !opensWithQuote(entry))) {
      const { composition } = slide;
      const md = runtime.surfaces.markdown.render(composition, {
        heading: false,
      });
      expect(md.match(/^# /gm), composition.title).toHaveLength(1);
      expect(md.startsWith('# '), composition.title).toBe(true);
    }
  });

  it('opens every slide with one Slack header', () => {
    for (const slide of deck.filter((entry) => !opensWithQuote(entry))) {
      const { composition } = slide;
      const { blocks } = runtime.surfaces.slack.render(composition, {
        heading: false,
      });
      expect(
        blocks.filter(({ type }) => type === 'header'),
        composition.title
      ).toHaveLength(1);
      expect(blocks[0]?.type, composition.title).toBe('header');
    }
  });

  it('draws every node at full size, as the mock was designed', () => {
    for (const { composition } of deck) {
      const { html } = runtime.surfaces.html.render(composition, {
        heading: false,
      });
      expect(html.match(/\w+Size-[ms]\b/g), composition.title).toBeNull();
    }
  });

  it('re-exports every slideJsx component, with Composition as Slide', () => {
    const exported = shim as Record<string, unknown>;
    // `component` builds components for types outside the pack, which the deck never draws.
    const missing = Object.keys(slideJsx).filter((name) => {
      const local = name === 'Composition' ? 'Slide' : name;
      return name === 'component'
        ? false
        : name === 'toJsx'
          ? typeof exported[local] !== 'function'
          : exported[local] !== slideJsx[name as keyof typeof slideJsx];
    });
    expect(missing).toEqual([]);
  });

  it('prints every slide as JSX that parses back to the same composition', () => {
    const components = Object.entries(shim).filter(([name]) =>
      /^Slide/.test(name)
    );
    for (const { composition } of deck) {
      const { outputText } = ts.transpileModule(
        `(${shim.toJsx(composition)})`,
        {
          compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: 'h' },
        }
      );
      const run = runInThisContext(
        `(h, ${components.map(([name]) => name).join(', ')}) => ${outputText.trim().replace(/;$/, '')}`
      ) as (...args: unknown[]) => ReactElement;
      const element = run(
        createElement,
        ...components.map(([, component]) => component)
      );
      expect(
        shim.toComposition(element as Parameters<typeof shim.toComposition>[0]),
        composition.title
      ).toEqual(composition);
    }
  });

  it('resolves every embedded render', () => {
    for (const slide of deck) {
      for (const node of nodesOf(slide)) {
        if (node.type === 'slideRender') {
          expect(node, slide.slug).toHaveProperty('composition');
        }
      }
    }
  });

  it('replays a real parse failure and a real recovery on the agent slide', () => {
    expect(runtime.parse(firstAttempt).valid).toBe(false);
    expect(runtime.parse(secondAttempt).valid).toBe(true);
  });

  it('counts only registered primitives as added on the growth slide', () => {
    const registered = slideDeckPrimitives.map(({ type }) => type);
    expect(new Set(addedSinceRedesign).size).toBe(addedSinceRedesign.length);
    expect(registered).toEqual(expect.arrayContaining([...addedSinceRedesign]));
  });
});
