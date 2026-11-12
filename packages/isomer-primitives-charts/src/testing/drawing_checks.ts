/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
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

/** A `#rrggbb[aa]` or `rgb[a](…)` color's channels, as `r,g,b`. */
export const rgbOf = (color: string): string => {
  const hex = /^#([\da-f]{2})([\da-f]{2})([\da-f]{2})/i.exec(color);
  return hex
    ? hex
        .slice(1, 4)
        .map((pair) => parseInt(pair, 16))
        .join(',')
    : (/^rgba?\(([^)]*)\)/.exec(color)?.[1] ?? color)
        .split(',')
        .slice(0, 3)
        .map((channel) => Number(channel.trim()))
        .join(',');
};

/** Markup text with its entities decoded. */
export const unescapeMarkup = (text: string): string =>
  text
    .replace(/&#(\d+);/g, (_, code: string) =>
      String.fromCharCode(Number(code))
    )
    .replace(/&#x([\da-f]+);/gi, (_, code: string) =>
      String.fromCharCode(parseInt(code, 16))
    )
    .replace(/&quot;/g, '"')
    .replace(/&#?39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');

// An engine may break a string across lines, even mid-word.
const squash = (text: string) => text.replace(/\s+/g, '');

/**
 * Whether `value` is drawn whole, or, where it does not fit, its start on one
 * or more lines and an ellipsis.
 */
export const textDrawn = (texts: readonly string[], value: string): boolean => {
  const whole = squash(value);
  if (squash(texts.join('')).includes(whole)) {
    return true;
  }
  return texts.some(
    (text, end) =>
      text.endsWith('…') &&
      texts.slice(0, end + 1).some((_, start) => {
        const shown = squash(texts.slice(start, end + 1).join('')).slice(0, -1);
        return shown.length > 0 && whole.startsWith(shown);
      })
  );
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
      return reading.texts.join(' ') === partition.empty.text
        ? []
        : [
            `an empty chart draws "${partition.empty.text}" alone, not ${JSON.stringify(reading.texts)}`,
          ];
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
      ...reading.texts
        .flatMap((text) => text.split(/\s+/))
        .filter(
          (word) =>
            word !== '' &&
            !words.some((known) => known.includes(word.replace(/…$/, '')))
        )
        .map(
          (word) => `"${word}" is drawn but is no slice's or legend item's text`
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
