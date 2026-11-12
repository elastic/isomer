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

import { debugStateProblems } from '@elastic/isomer-charts-elastic/testing';
import {
  coverageProblems,
  drawExamples,
  drawingProblems,
  type DrawingReader,
  unescapeMarkup,
} from '@elastic/isomer-primitives-charts/testing';
import { describe, expect, it } from 'vitest';

import { createElasticChartsStaticRenderer, renderSceneSvg } from './svg';

const renderer = createElasticChartsStaticRenderer();
const examples = drawExamples([renderer]);

/** Every string the SVG draws as `<text>`, unescaped. */
const svgTexts = (svg: string): string[] =>
  [...svg.matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map(([, text]) =>
    unescapeMarkup(text!)
  );

/** The drawing's box, name and description from its `<svg>`, its text and its paint. */
export const readSvg: DrawingReader = ({ markup }) => {
  const [, open = '', title, description] =
    /(<svg\b[^>]*>)(?:<title>([^<]*)<\/title>)?(?:<desc>([^<]*)<\/desc>)?/.exec(
      markup
    ) ?? [];
  const attribute = (name: string) =>
    new RegExp(` ${name}="([^"]*)"`).exec(open)?.[1];
  const background = /<rect\b[^>]*\bfill="([^"]+)"/.exec(markup)?.[1];
  return {
    width: Number(attribute('width')),
    height: Number(attribute('height')),
    ...(title === undefined ? {} : { title: unescapeMarkup(title) }),
    ...(description === undefined
      ? {}
      : { description: unescapeMarkup(description) }),
    ...(background === undefined ? {} : { background }),
    texts: svgTexts(markup),
    colors: [
      ...markup.matchAll(/<(?:path|rect)\b[^>]*\b(?:fill|stroke)="([^"]+)"/g),
    ].map(([, color]) => color!),
  };
};

describe('renderer parity: static Elastic Charts', () => {
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
      const reading = readSvg(drawing);
      const { debugState } = renderSceneSvg(drawing.scene);
      // Every tick label Elastic Charts reports is drawn as SVG text.
      const unlabelled = [
        ...(debugState?.axes?.x ?? []),
        ...(debugState?.axes?.y ?? []),
      ]
        .flatMap(({ labels }) => labels)
        .filter((label) => label !== '' && !reading.texts.includes(label));
      expect([
        ...drawingProblems(drawing, reading),
        ...debugStateProblems(drawing.scene, debugState),
        ...unlabelled.map(
          (text) => `"${text}" is reported drawn but is no SVG text`
        ),
      ]).toEqual([]);
    }
  );
});
