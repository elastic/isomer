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

const HEX = /^#([\da-f]{3,4}|[\da-f]{6}|[\da-f]{8})$/i;
const RGB = /^rgba?\(([^)]*)\)$/i;
const CHANNEL = /^\d*\.?\d+%?$/;

const hexChannels = (digits: string): number[] =>
  (digits.length < 6
    ? [...digits].map((digit) => digit + digit)
    : (digits.match(/../g) ?? [])
  )
    .slice(0, 3)
    .map((pair) => parseInt(pair, 16));

const rgbChannels = (channels: string): number[] =>
  channels
    .trim()
    .split(/[\s,/]+/)
    .slice(0, 3)
    .map((channel) =>
      !CHANNEL.test(channel)
        ? NaN
        : channel.endsWith('%')
          ? parseFloat(channel) * 2.55
          : Number(channel)
    );

let unread = 0;

/**
 * A `#rgb[a]`, `#rrggbb[aa]` or `rgb[a](…)` color's channels, as `r,g,b`,
 * its alpha apart. Any other paint, such as `none` or `currentColor`, reads
 * as a string no other call returns, so it equals no color and no paint.
 */
export const rgbOf = (color: string): string => {
  const paint = color.trim();
  const hex = HEX.exec(paint)?.[1];
  const channels = hex
    ? hexChannels(hex)
    : rgbChannels(RGB.exec(paint)?.[1] ?? '');
  return channels.length === 3 && channels.every(Number.isFinite)
    ? channels.map(Math.round).join(',')
    : `unread ${unread++}`;
};

const character = (code: number, reference: string) =>
  code <= 0x10ffff ? String.fromCodePoint(code) : reference;

/** Markup text with its entities decoded. */
export const unescapeMarkup = (text: string): string =>
  text
    .replace(/&#(\d+);/g, (reference, code: string) =>
      character(Number(code), reference)
    )
    .replace(/&#x([\da-f]+);/gi, (reference, code: string) =>
      character(parseInt(code, 16), reference)
    )
    .replace(/&nbsp;/g, String.fromCodePoint(0xa0))
    .replace(/&quot;/g, '"')
    .replace(/&#?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

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

/** The `drawn` words that are no `known` word, whole, cut with an ellipsis, or broken across consecutive words. */
const strayWords = (
  drawn: readonly string[],
  known: readonly string[]
): string[] => {
  const strays: string[] = [];
  for (let at = 0; at < drawn.length;) {
    let shown = '';
    let end = at;
    let found = false;
    while (!found && end < drawn.length) {
      shown += drawn[end++];
      const cut = shown.endsWith('…') ? shown.slice(0, -1) : undefined;
      found =
        known.includes(shown) ||
        (cut !== undefined && known.some((word) => word.startsWith(cut)));
      if (!known.some((word) => word.startsWith(shown))) {
        break;
      }
    }
    if (!found) {
      strays.push(drawn[at]!);
    }
    at = found ? end : at + 1;
  }
  return strays;
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
