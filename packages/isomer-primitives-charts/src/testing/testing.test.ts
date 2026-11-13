/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { describe, expect, it } from 'vitest';

import type { ReactSceneRenderer } from '../render/context';
import type {
  HeatmapScene,
  MetricScene,
  PartitionScene,
  Scene,
  XyScene,
} from '../scene/types';
import {
  CHECKED_KINDS,
  coverageProblems,
  drawExamples,
  drawingProblems,
  type DrawingReader,
  type DrawnScene,
  rgbOf,
  sceneDescription,
  textDrawn,
  unescapeMarkup,
} from '.';

const COLOR = /^(#[\da-f]{6}([\da-f]{2})?|rgba?\([^)]*\))$/i;

/** The subtrees of a Scene a chart draws, by kind. */
const drawnParts = (scene: Scene): unknown[] => {
  switch (scene.kind) {
    case 'xy':
      return [
        scene.axes,
        scene.layers,
        scene.legend.visible ? scene.legend : [],
      ];
    case 'metric':
      return [scene.tiles];
    case 'partition':
      return scene.empty
        ? [scene.empty.text]
        : [scene.nodes, scene.legend.visible ? scene.legend.items : []];
    case 'heatmap':
      return scene.empty
        ? [scene.empty.text]
        : [
            scene.x.title ?? [],
            scene.y.title ?? [],
            scene.cells.map(({ color }) => color),
            scene.legend.visible ? scene.bands : [],
          ];
    default:
      return [];
  }
};

// What a Scene carries for tooltips, events and screen readers, which no chart draws.
const UNDRAWN = new Set([
  'source',
  'tooltip',
  'description',
  'selection',
  'key',
  'id',
  'metric',
]);

/** Every string leaf under `value` a chart could draw, colors apart. */
const leaves = (
  value: unknown,
  into = { texts: [] as string[], colors: [] as string[] }
) => {
  if (typeof value === 'string') {
    (COLOR.test(value) ? into.colors : into.texts).push(value);
  } else if (Array.isArray(value)) {
    value.forEach((item) => leaves(item, into));
  } else if (value && typeof value === 'object') {
    Object.entries(value).forEach(([key, item]) => {
      if (!UNDRAWN.has(key)) {
        leaves(item, into);
      }
    });
  }
  return into;
};

// Draws what each kind shows by walking those parts of the Scene generically,
// not through the checks' own list of fields, so a pass is evidence.
const fake: ReactSceneRenderer = {
  id: 'fake',
  environments: ['node'],
  sized: true,
  supports: (kind) => CHECKED_KINDS.includes(kind),
  render: (scene) => {
    const { texts, colors } = leaves(drawnParts(scene));
    return createElement(
      'figure',
      {
        'data-width': scene.size?.width,
        'data-height': scene.size?.height,
        'data-title': scene.title,
        'data-desc': sceneDescription(scene),
        'data-background': scene.chrome.background,
      },
      ...texts.map((text, index) =>
        createElement('span', { key: `t${index}` }, text)
      ),
      ...colors.map((color, index) =>
        createElement('i', { key: `c${index}`, 'data-color': color })
      )
    );
  },
};

const attribute = (markup: string, name: string) => {
  const value = new RegExp(` ${name}="([^"]*)"`).exec(markup)?.[1];
  return value === undefined ? undefined : unescapeMarkup(value);
};

const read: DrawingReader = ({ markup }) => {
  const title = attribute(markup, 'data-title');
  const description = attribute(markup, 'data-desc');
  const background = attribute(markup, 'data-background');
  return {
    width: Number(attribute(markup, 'data-width')),
    height: Number(attribute(markup, 'data-height')),
    ...(title === undefined ? {} : { title }),
    ...(description === undefined ? {} : { description }),
    ...(background === undefined ? {} : { background }),
    texts: [...markup.matchAll(/<span>([^<]*)<\/span>/g)].map(([, text]) =>
      unescapeMarkup(text!)
    ),
    colors: [...markup.matchAll(/data-color="([^"]*)"/g)].map(
      ([, color]) => color!
    ),
  };
};

const examples = drawExamples([fake]);
const { drawn } = examples;
const first = (kind: Scene['kind']) =>
  drawn.find(({ scene }) => scene.kind === kind)!;

describe('the static renderer checks', () => {
  it('draw every example and pass a renderer that draws each Scene’s parts', () => {
    expect(coverageProblems(examples, (kind) => fake.supports(kind))).toEqual(
      []
    );
    expect(new Set(drawn.map(({ scene }) => scene.kind))).toEqual(
      new Set(['xy', 'metric', 'partition', 'heatmap'])
    );
    for (const drawing of drawn) {
      expect(drawingProblems(drawing, read(drawing)), drawing.example).toEqual(
        []
      );
    }
  });

  const mutated = (drawing: DrawnScene, change: (markup: string) => string) =>
    drawingProblems(
      drawing,
      read({ ...drawing, markup: change(drawing.markup) })
    );

  it('fail a drawing with a tile title missing', () => {
    const drawing = first('metric');
    const { title } = (drawing.scene as MetricScene).tiles[0]!;
    const problems = mutated(drawing, (markup) =>
      markup.replace(`<span>${title}</span>`, '')
    );
    expect(problems).toContain(`tile title "${title}" is not drawn`);
  });

  it('fail a drawing with a series painted another color', () => {
    const drawing = first('xy');
    const layer = (drawing.scene as XyScene).layers.find(
      ({ kind }) => kind === 'series'
    )!;
    if (layer.kind !== 'series') {
      throw new Error('no series');
    }
    const { color, label } = layer.series;
    const problems = mutated(drawing, (markup) =>
      markup.replaceAll(`data-color="${color}"`, 'data-color="#123456"')
    );
    expect(problems).toContain(`series "${label}" ${color} is not painted`);
  });

  const recolored = (drawing: DrawnScene, color: string): DrawnScene => {
    const scene = drawing.scene as XyScene;
    return {
      ...drawing,
      scene: {
        ...scene,
        layers: scene.layers.map((layer) =>
          layer.kind === 'series'
            ? { ...layer, series: { ...layer.series, color } }
            : layer
        ),
      },
    };
  };
  const seriesProblems = (drawing: DrawnScene, paint: string) =>
    mutated(drawing, (markup) =>
      markup.replace(/data-color="[^"]*"/g, `data-color="${paint}"`)
    ).filter((problem) => problem.startsWith('series '));

  it('fail a `#rgb` series painted with a paint that is no color', () => {
    const drawing = recolored(first('xy'), '#abc');
    for (const paint of ['none', 'currentColor', 'url(#fill)', '#abd']) {
      expect(seriesProblems(drawing, paint), paint).not.toEqual([]);
    }
  });

  it('pass a series painted its color in another notation', () => {
    expect(seriesProblems(recolored(first('xy'), '#ffffff'), '#fff')).toEqual(
      []
    );
    const drawing = recolored(first('xy'), '#abc');
    for (const paint of [
      '#AABBCC',
      '#aabbccff',
      'rgb(170, 187, 204)',
      'rgb(170 187 204)',
      'rgba(170 187 204 / 0.5)',
    ]) {
      expect(seriesProblems(drawing, paint), paint).toEqual([]);
    }
  });

  it('fail a tile value drawn as another number that holds its digits', () => {
    const drawing = first('metric');
    const { text } = (drawing.scene as MetricScene).tiles[0]!.value;
    expect(drawing.markup).toContain(`<span>${text}</span>`);
    const problems = mutated(drawing, (markup) =>
      markup.replaceAll(`<span>${text}</span>`, `<span>${text}7</span>`)
    );
    expect(problems).toContain(`tile value "${text}" is not drawn`);
  });

  it('fail a partition drawing a fragment of a label', () => {
    const drawing = drawn.find(
      ({ scene }) => scene.kind === 'partition' && !scene.empty
    )!;
    const { label } = (drawing.scene as PartitionScene).nodes[0]!;
    const fragment = label.slice(0, -1);
    expect(fragment).toMatch(/^\S+$/);
    expect(
      mutated(drawing, (markup) =>
        markup.replace('</figure>', `<span>${fragment}</span></figure>`)
      )
    ).toContain(
      `"${fragment}" is drawn but is no slice's or legend item's text`
    );
  });

  it('fail a drawing at another size, without a description or on another background', () => {
    const drawing = first('partition');
    const { width } = drawing.scene.size!;
    expect(
      mutated(drawing, (markup) =>
        markup.replace(`data-width="${width}"`, `data-width="${width + 1}"`)
      )[0]
    ).toMatch(/^drawn /);
    expect(
      mutated(drawing, (markup) => markup.replace(/ data-desc="[^"]*"/, ''))
    ).toContain(
      `described undefined, not ${JSON.stringify(sceneDescription(drawing.scene))}`
    );
    expect(
      mutated(drawing, (markup) =>
        markup.replace(/ data-background="[^"]*"/, ' data-background="#010203"')
      )[0]
    ).toMatch(/^on #010203/);
  });

  it('fail a partition drawing a word that is none of its slices’ or legend’s', () => {
    const drawing = drawn.find(
      ({ scene }) => scene.kind === 'partition' && !scene.empty
    )!;
    expect(
      mutated(drawing, (markup) =>
        markup.replace('</figure>', '<span>Bogus</span></figure>')
      )
    ).toContain(`"Bogus" is drawn but is no slice's or legend item's text`);
  });

  it('fail a heatmap drawing with a cell color or a legend band missing', () => {
    const drawing = drawn.find(
      ({ scene }) =>
        scene.kind === 'heatmap' && !scene.empty && scene.legend.visible
    )!;
    const { cells, bands } = drawing.scene as HeatmapScene;
    const { color } = cells[0]!;
    const { label } = bands[0]!;
    expect(
      mutated(drawing, (markup) =>
        markup.replaceAll(`data-color="${color}"`, 'data-color="#123456"')
      )
    ).toContain(`cell ${color} is not painted`);
    expect(
      mutated(drawing, (markup) => markup.replace(`<span>${label}</span>`, ''))
    ).toContain(`legend band "${label}" is not drawn`);
  });

  it('fail coverage when a supported Scene goes undrawn', () => {
    const skipping = drawExamples([
      { ...fake, supports: (kind) => kind === 'xy' },
    ]);
    expect(
      coverageProblems(skipping, (kind) => kind === 'xy' || kind === 'metric')
    ).toEqual(
      expect.arrayContaining([
        expect.stringMatching(/its metric Scene is not drawn$/),
      ])
    );
    expect(coverageProblems(examples, () => true)).toContain(
      'no content check for table Scenes'
    );
  });

  it('accept text drawn whole or cut with an ellipsis, and nothing else', () => {
    expect(textDrawn(['Requests', 'per hour'], 'Requests per hour')).toBe(true);
    expect(textDrawn(['Requests p…'], 'Requests per hour')).toBe(true);
    expect(textDrawn(['Responses…'], 'Requests per hour')).toBe(false);
    expect(textDrawn(['Requests'], 'Requests per hour')).toBe(false);
    expect(
      textDrawn(['Total', 'Requests', 'per hour', '12'], 'Requests per hour')
    ).toBe(true);
    expect(
      textDrawn(['Total', 'Reque', 'sts p…', '12'], 'Requests per hour')
    ).toBe(true);
    expect(textDrawn(['12', '31'], '1')).toBe(false);
    expect(textDrawn(['12', '31'], '23')).toBe(false);
    expect(
      textDrawn(['Requests per hour, all hosts'], 'Requests per hour')
    ).toBe(false);
    expect(textDrawn(['Requests'], '')).toBe(true);
  });

  it('read a color’s channels in any hex or `rgb()` notation, and match no other paint', () => {
    for (const color of [
      '#abc',
      '#ABCD',
      '#aabbcc',
      '#aabbcc80',
      'rgb(170,187,204)',
      'RGB(170 187 204)',
      'rgba(170, 187, 204, 0.5)',
      'rgb(170 187 204 / 50%)',
    ]) {
      expect(rgbOf(color), color).toBe('170,187,204');
    }
    for (const paint of ['none', 'currentColor', '#abcde', 'rgb(1 2)', '']) {
      expect(rgbOf(paint), paint).not.toBe(rgbOf(paint));
    }
  });

  it('decode astral character references and `&nbsp;`', () => {
    expect(unescapeMarkup('&#128512; &#x1F600;')).toBe('\u{1F600} \u{1F600}');
    expect(unescapeMarkup('5&nbsp;ms')).toBe(
      `5${String.fromCodePoint(0xa0)}ms`
    );
    expect(unescapeMarkup('&amp;nbsp; &#1114112;')).toBe('&nbsp; &#1114112;');
    expect(
      textDrawn([unescapeMarkup('Up &#x1F600;&nbsp;now')], 'Up \u{1F600} now')
    ).toBe(true);
  });
});
