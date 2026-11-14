/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  HeatmapScene,
  MetricScene,
  PartitionNode,
  PartitionScene,
  Scene,
  SceneKind,
  XyScene,
} from '../scene/types';

import type { DrawnExamples, DrawnScene } from './draw_examples';

/**
 * What a static renderer's drawing shows, as its engine reads it back. Read
 * what the output draws wherever it can: an engine that draws into bitmaps can
 * only report what its engine says it drew, which is weaker evidence than text
 * and paint in the markup.
 */
export interface DrawingReading {
  readonly width: number;
  readonly height: number;
  /** The drawing's accessible name. */
  readonly title?: string;
  /** The drawing's accessible description. */
  readonly description?: string;
  readonly background?: string;
  /** Every string drawn, in draw order, unescaped. */
  readonly texts: readonly string[];
  /** Every color painted. */
  readonly colors: readonly string[];
}

/** Reads a drawing back; one per engine. */
export type DrawingReader = (drawing: DrawnScene) => DrawingReading;

const NUMBER = String.raw`(\d+(?:\.\d+)?|\.\d+)`;
const SHORT_HEX = /^#([\da-f])([\da-f])([\da-f])[\da-f]?$/i;
const LONG_HEX = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})(?:[\da-f]{2})?$/i;
const COMMA_RGB = new RegExp(
  String.raw`^rgba?\(\s*${NUMBER}\s*,\s*${NUMBER}\s*,\s*${NUMBER}\s*(?:,\s*${NUMBER}%?\s*)?\)$`,
  'i'
);
const SPACE_RGB = new RegExp(
  String.raw`^rgba?\(\s*${NUMBER}\s+${NUMBER}\s+${NUMBER}\s*(?:/\s*${NUMBER}%?\s*)?\)$`,
  'i'
);

/** The three channels of a paint in exactly one of the notations {@link rgbOf} reads. */
const channelsOf = (paint: string): number[] | undefined => {
  const short = SHORT_HEX.exec(paint);
  if (short) {
    return short.slice(1, 4).map((digit) => parseInt(digit + digit, 16));
  }
  const long = LONG_HEX.exec(paint);
  if (long) {
    return long.slice(1, 4).map((pair) => parseInt(pair, 16));
  }
  const channels = (COMMA_RGB.exec(paint) ?? SPACE_RGB.exec(paint))
    ?.slice(1, 4)
    .map((channel) => Math.round(Number(channel)));
  return channels?.every((channel) => channel <= 255) ? channels : undefined;
};

let unread = 0;

/**
 * A color's channels, as `r,g,b`, its alpha apart: `#rgb[a]`, `#rrggbb[aa]`,
 * `rgb[a](r, g, b[, a])` or `rgb[a](r g b[ / a])` with channels from 0 to 255.
 * Any other paint, such as `none`, reads as a string no other call returns,
 * so it equals no color and no paint.
 */
export const rgbOf = (color: string): string =>
  channelsOf(color.trim())?.join(',') ?? `unread ${unread++}`;

const NAMED: Readonly<Record<string, string>> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: String.fromCodePoint(0xa0),
  quot: '"',
};
const REFERENCE = /&(?:#(\d+)|#[xX]([\da-fA-F]+)|(amp|apos|gt|lt|nbsp|quot));/g;

/** Markup text with its character references decoded, each once. */
export const unescapeMarkup = (text: string): string =>
  text.replace(
    REFERENCE,
    (reference, decimal?: string, hex?: string, name?: string) => {
      if (name !== undefined) {
        return NAMED[name]!;
      }
      const code = decimal === undefined ? parseInt(hex!, 16) : Number(decimal);
      return code <= 0x10ffff ? String.fromCodePoint(code) : reference;
    }
  );

// An engine may break a string across lines, even mid-word.
const squash = (text: string) => text.replace(/\s+/g, '');

/** Whether the runs from some run on spell `whole`, or its start and an ellipsis. */
const spelled = (runs: readonly string[], whole: string): boolean =>
  runs.some((_, start) => {
    let shown = '';
    for (const run of runs.slice(start)) {
      shown += run;
      if (shown === whole) {
        return true;
      }
      if (run.endsWith('…')) {
        return shown.length > 1 && whole.startsWith(shown.slice(0, -1));
      }
      if (!whole.startsWith(shown)) {
        return false;
      }
    }
    return false;
  });

/**
 * Whether `value` is drawn: one whole entry of `texts`, or consecutive entries
 * that are its lines, or, where it does not fit, its start on one or more
 * lines and an ellipsis. Whitespace apart; an empty `value` has nothing to draw.
 */
export const textDrawn = (texts: readonly string[], value: string): boolean => {
  const whole = squash(value);
  return whole === '' || spelled(texts.map(squash), whole);
};

/**
 * The `drawn` words left over when the rest divide into `known` words, each
 * whole, cut with an ellipsis, or broken across consecutive words: the fewest
 * any such division leaves.
 */
const strayWords = (
  drawn: readonly string[],
  known: readonly string[]
): readonly string[] => {
  const isKnown = (shown: string) =>
    known.includes(shown) ||
    (shown.endsWith('…') &&
      known.some((word) => word.startsWith(shown.slice(0, -1))));
  // `fewest[at]` is the strays among the words from `at` on.
  const fewest: (readonly string[])[] = [];
  fewest[drawn.length] = [];
  for (let at = drawn.length - 1; at >= 0; at--) {
    let best = [drawn[at]!, ...fewest[at + 1]!];
    let shown = '';
    for (let end = at; end < drawn.length; end++) {
      shown += drawn[end];
      const rest = fewest[end + 1]!;
      if (isKnown(shown) && rest.length < best.length) {
        best = [...rest];
      }
      if (!known.some((word) => word.startsWith(shown))) {
        break;
      }
    }
    fewest[at] = best;
  }
  return fewest[0]!;
};

/** The accessible description a drawing of `scene` carries: its summary, then its authored description. */
export const sceneDescription = ({ summary, description }: Scene): string =>
  description ? `${summary} ${description}` : summary;

const slices = (nodes: readonly PartitionNode[]): readonly PartitionNode[] =>
  nodes.flatMap((node) => [node, ...slices(node.children)]);

type Check = (scene: Scene, reading: DrawingReading) => string[];

const drawnText = (reading: DrawingReading, what: string, value: string) =>
  textDrawn(reading.texts, value) ? [] : [`${what} "${value}" is not drawn`];

const painted = (reading: DrawingReading, what: string, color: string) =>
  reading.colors.map(rgbOf).includes(rgbOf(color))
    ? []
    : [`${what} ${color} is not painted`];

const emptyAlone = (reading: DrawingReading, text: string) =>
  reading.texts.join(' ') === text
    ? []
    : [
        `an empty chart draws "${text}" alone, not ${JSON.stringify(reading.texts)}`,
      ];

// A fully transparent fill has no paint to find.
const CLEAR = /^#[\da-f]{6}00$/i;

/** What each kind's drawing must show beyond its box, name and background. */
const KIND_CHECKS: Partial<Record<SceneKind, Check>> = {
  xy: (scene, reading) => {
    const { axes, layers } = scene as XyScene;
    return [
      ...[axes.x, axes.y, axes.y2].flatMap((axis) =>
        axis?.title === undefined
          ? []
          : drawnText(reading, 'axis title', axis.title)
      ),
      ...layers.flatMap((layer) =>
        layer.kind === 'series'
          ? painted(
              reading,
              `series "${layer.series.label}"`,
              layer.series.color
            )
          : []
      ),
    ];
  },
  metric: (scene, reading) =>
    (scene as MetricScene).tiles.flatMap((tile) => [
      ...drawnText(reading, 'tile title', tile.title),
      ...(tile.subtitle
        ? drawnText(reading, 'tile subtitle', tile.subtitle)
        : []),
      ...drawnText(reading, 'tile value', tile.value.text),
      ...(tile.secondary
        ? drawnText(reading, 'tile secondary', tile.secondary.text)
        : []),
    ]),
  partition: (scene, reading) => {
    const partition = scene as PartitionScene;
    if (partition.empty) {
      return emptyAlone(reading, partition.empty.text);
    }
    const all = slices(partition.nodes);
    const words = [
      ...all.flatMap(({ label, valueLabel, valueText, percentText }) => [
        label,
        valueLabel,
        valueText,
        percentText,
      ]),
      ...partition.legend.items.flatMap(({ label, value }) => [
        label,
        value ?? '',
      ]),
    ].flatMap((text) => text.split(/\s+/));
    return [
      // A slice with no share has no area to paint.
      ...all.flatMap(({ key, color, share }) =>
        share > 0 ? painted(reading, `slice "${key}"`, color) : []
      ),
      ...(partition.legend.visible ? partition.legend.items : []).flatMap(
        ({ label, value }) => [
          ...drawnText(reading, 'legend item', label),
          ...(value ? drawnText(reading, 'legend value', value) : []),
        ]
      ),
      ...strayWords(
        reading.texts
          .flatMap((text) => text.split(/\s+/))
          .filter((word) => word !== ''),
        words
      ).map(
        (word) => `"${word}" is drawn but is no slice's or legend item's text`
      ),
    ];
  },
  heatmap: (scene, reading) => {
    const { empty, x, y, cells, bands, legend } = scene as HeatmapScene;
    if (empty) {
      return emptyAlone(reading, empty.text);
    }
    return [
      ...[x, y].flatMap(({ title }) =>
        title === undefined ? [] : drawnText(reading, 'axis title', title)
      ),
      ...[...new Set(cells.map(({ color }) => color))]
        .filter((color) => !CLEAR.test(color))
        .flatMap((color) => painted(reading, 'cell', color)),
      ...(legend.visible ? bands : []).flatMap(({ label }) =>
        drawnText(reading, 'legend band', label)
      ),
    ];
  },
};

/** The kinds {@link drawingProblems} has content checks for. */
export const CHECKED_KINDS = Object.keys(KIND_CHECKS) as readonly SceneKind[];

/**
 * Where a static renderer's drawing of a Scene differs from the Scene: its
 * box, accessible name and description, background, and the strings and
 * colors its kind draws. Empty when it carries them exactly.
 */
export const drawingProblems = (
  { scene }: Pick<DrawnScene, 'scene'>,
  reading: DrawingReading
): string[] => {
  const problems: string[] = [];
  const { size } = scene;
  if (!size || reading.width !== size.width || reading.height !== size.height) {
    problems.push(
      `drawn ${reading.width}×${reading.height}, not ${size ? `${size.width}×${size.height}` : 'at a Scene size'}`
    );
  }
  if (reading.title !== scene.title) {
    problems.push(
      `named ${JSON.stringify(reading.title)}, not ${JSON.stringify(scene.title)}`
    );
  }
  if (reading.description !== sceneDescription(scene)) {
    problems.push(
      `described ${JSON.stringify(reading.description)}, not ${JSON.stringify(sceneDescription(scene))}`
    );
  }
  if (
    reading.background === undefined ||
    rgbOf(reading.background) !== rgbOf(scene.chrome.background)
  ) {
    problems.push(
      `on ${String(reading.background)}, not ${scene.chrome.background}`
    );
  }
  const check = KIND_CHECKS[scene.kind];
  return check
    ? [...problems, ...check(scene, reading)]
    : [...problems, `no content check for ${scene.kind} Scenes`];
};

/**
 * Where {@link drawExamples} shows `renderer` missing a Scene it supports, in
 * any example, or supporting a kind with no content check.
 */
export const coverageProblems = (
  { drawn, resolved, examples }: DrawnExamples,
  supports: (kind: SceneKind) => boolean
): string[] => {
  const problems: string[] = [];
  const kinds = [...new Set(resolved.map(({ kind }) => kind))].filter(supports);
  for (const kind of kinds) {
    if (!CHECKED_KINDS.includes(kind)) {
      problems.push(`no content check for ${kind} Scenes`);
    }
  }
  for (const example of examples) {
    const expected = new Set(
      resolved
        .filter((entry) => entry.example === example && supports(entry.kind))
        .map(({ kind }) => kind)
    );
    const got = new Set(
      drawn
        .filter((entry) => entry.example === example)
        .map(({ scene }) => scene.kind)
    );
    for (const kind of expected) {
      if (!got.has(kind)) {
        problems.push(`${example}: its ${kind} Scene is not drawn`);
      }
    }
  }
  return problems;
};
