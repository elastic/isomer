/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Renderer parity over every example: what this engine draws for each Scene
// the charts pack hands it carries the Scene's strings and colors, as the
// charts pack's and the Elastic Charts engine's checks read them. Look is
// compared in Chromium, in `e2e/`.

import type { DebugState } from '@elastic/charts';
import { debugStateProblems } from '@elastic/isomer-charts-elastic/testing';
import {
  coverageProblems,
  drawExamples,
  drawingProblems,
  type DrawingReader,
} from '@elastic/isomer-primitives-charts/testing';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import { createElasticChartsStaticRenderer } from './svg';

const renderer = createElasticChartsStaticRenderer();
const examples = drawExamples([renderer]);

const elementsByClass = (root: Element, name: string) =>
  [...root.getElementsByClassName(name)] as HTMLElement[];

/** Every text node's text under `node`, in order, past Elastic Charts' screen-reader text and the stylesheet. */
const domTexts = (node: Node): string[] => {
  if (node.nodeType === node.TEXT_NODE) {
    const text = node.textContent?.trim();
    return text ? [text] : [];
  }
  if (
    node instanceof node.ownerDocument!.defaultView!.Element &&
    (node.tagName === 'STYLE' || node.classList.contains('echScreenReaderOnly'))
  ) {
    return [];
  }
  return [...node.childNodes].flatMap(domTexts);
};

/** Every string drawn as SVG `<text>` under `root`. */
const svgTexts = (root: Element): string[] =>
  [...root.getElementsByTagName('text')].flatMap(domTexts);

/** Every `fill` and `stroke` painted in SVG under `root`, by attribute or inline style. */
const svgPaint = (root: Element): string[] =>
  [...root.getElementsByTagName('svg')]
    .flatMap((svg) => [...svg.getElementsByTagName('*')])
    .flatMap((element) =>
      ['fill', 'stroke'].flatMap((property) => [
        element.getAttribute(property) ?? '',
        (element as SVGElement).style?.getPropertyValue(property) ?? '',
      ])
    )
    .filter((color) => color !== '' && color !== 'none');

/** What Elastic Charts reports for the drawing, from its status element. */
export const debugStateIn = (root: Element): DebugState | undefined => {
  const raw = elementsByClass(root, 'echChartStatus')[0]?.getAttribute(
    'data-ech-debug-state'
  );
  return raw ? (JSON.parse(raw) as DebugState) : undefined;
};

/** The drawing's box, name and description from its wrapper, its background, and the text and paint it shows. */
export const readDrawing: DrawingReader = ({ markup }) => {
  const { document } = new JSDOM(markup).window;
  const wrapper = document.body.firstElementChild!
    .firstElementChild as HTMLElement;
  // An empty Scene draws the browser engine's note, on the Scene's background.
  const note = [...wrapper.getElementsByTagName('div')].find(
    (element) => element.getAttribute('role') === 'img'
  );
  const background =
    elementsByClass(wrapper, 'echChartBackground')[0]?.style.backgroundColor ||
    note?.style.getPropertyValue('--charts-chartsElastic-empty-fill');
  const title = wrapper.getAttribute('aria-label');
  const description = wrapper.getAttribute('aria-description');
  return {
    width: parseFloat(
      wrapper.style.getPropertyValue('--charts-chartsElasticStatic-box-width')
    ),
    height: parseFloat(
      wrapper.style.getPropertyValue('--charts-chartsElasticStatic-box-height')
    ),
    ...(title === null ? {} : { title }),
    ...(description === null ? {} : { description }),
    ...(background ? { background } : {}),
    texts: domTexts(wrapper),
    colors: svgPaint(wrapper),
  };
};

describe('renderer parity: static Elastic Charts on #2941', () => {
  it('draws every Scene of a kind it supports, in every example', () => {
    expect(
      coverageProblems(examples, (kind) => renderer.supports(kind))
    ).toEqual([]);
  });

  it.each(
    examples.drawn.map((drawing) => ({ ...drawing, kind: drawing.scene.kind }))
  )(
    '$example ($scheme): the $kind drawing carries the Scene’s strings and colors',
    (drawing) => {
      expect(drawing.scene.scheme).toBe(drawing.scheme);
      const { document } = new JSDOM(drawing.markup).window;
      const state = debugStateIn(document.body);
      const drawnTexts = svgTexts(document.body);
      const unlabelled = [...(state?.axes?.x ?? []), ...(state?.axes?.y ?? [])]
        .flatMap(({ labels }) => labels)
        .filter((label) => label !== '' && !drawnTexts.includes(label));
      expect([
        ...drawingProblems(drawing, readDrawing(drawing)),
        ...debugStateProblems(drawing.scene, state),
        ...unlabelled.map(
          (text) => `"${text}" is reported drawn but is no SVG text`
        ),
      ]).toEqual([]);
    }
  );
});
