/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A tagCloud node as Lens's tag cloud draws it (`expression_tagcloud`:
// `TagCloudChart`), with every word's text, weight and color decided here, so
// an engine only lays the words out.

import type { TagCloudNode } from '../schema/tag_cloud';

import {
  createResolution,
  describe,
  fractionAlong,
  keyPart,
  NO_RESULTS,
  type ResolveChartOptions,
  resolveInteractions,
  sceneBase,
  titled,
  toNumber,
} from './common';
import { categoricalColor, keyColor } from './theme';
import type { SceneSelection, TagCloudScene, TagCloudWord } from './types';

/** Lens's defaults: `tagcloud`'s `minFontSize` and `maxFontSize`. */
const FONT_SIZE = { min: 18, max: 72 } as const;

/** Lens's `ORIENTATIONS`: the angles a word may take, as Elastic Charts' word cloud reads them. */
const ANGLES = {
  single: { start: 0, end: 0, count: 360 },
  rightAngled: { start: 0, end: 90, count: 2 },
  multiple: { start: 0, end: -90, count: 12 },
} as const;

/** The Scene of a `tagCloud` node. */
export const resolveTagCloud = (
  node: TagCloudNode,
  options: ResolveChartOptions
): TagCloudScene => {
  const resolution = createResolution(node.data, options);
  const { data, scheme } = resolution;
  const tags = node.tags.column;
  const metric = node.metric.column;
  const tagsLabel = resolution.column(tags).label;
  const metricLabel = resolution.column(metric).label;
  const interactions = resolveInteractions(node);
  const selectable = interactions.select.includes('tag');

  const values = data.rows.map((_, row) =>
    toNumber(resolution.cell(metric, row))
  );
  const finite = values.filter((value): value is number => value !== undefined);
  const min = finite.reduce((least, value) => Math.min(least, value), Infinity);
  const max = finite.reduce((most, value) => Math.max(most, value), -Infinity);
  // A missing value weighs 0. Lens's `calculateWeight`: a lone row is whole;
  // otherwise each value's place in the range, and 0 where that is not a number.
  const weightOf = (value: number | undefined) =>
    value === undefined
      ? 0
      : data.rows.length <= 1
        ? 1
        : fractionAlong(min, max, value) || 0;

  // A tag's palette rank is the first row it shows in, as Lens ranks it.
  const firstRow = new Map<string, number>();
  data.rows.forEach((_, row) => {
    const identity = resolution.identity(tags, row);
    if (!firstRow.has(identity)) {
      firstRow.set(identity, row);
    }
  });
  const colors = node.colors?.byKey;

  const words: TagCloudWord[] = data.rows.map((_, row) => {
    const cell = resolution.cell(tags, row);
    const text = resolution.text(tags, row);
    const value = values[row];
    const valueText = resolution.text(metric, row);
    const description = describe([
      [tagsLabel, text],
      [metricLabel, valueText],
    ]);
    const selection: SceneSelection | undefined = selectable
      ? {
          target: 'tag',
          rows: [row],
          columns: [tags],
          values: { [tags]: cell },
          description,
        }
      : undefined;
    return {
      text,
      weight: weightOf(value),
      value: value ?? null,
      valueText,
      color:
        keyColor(colors, keyPart(cell), scheme) ??
        categoricalColor(firstRow.get(resolution.identity(tags, row)) ?? row),
      source: { rows: [row], columns: [tags, metric] },
      description,
      ...(selection ? { selection } : {}),
    };
  });

  const empty =
    words.length === 0
      ? { reason: 'noResults' as const, text: NO_RESULTS }
      : undefined;
  const largest = [...words]
    .filter(({ value }) => value !== null)
    .sort((a, b) => b.value! - a.value!)
    .slice(0, 3);
  const sentence = empty
    ? `${metricLabel} by ${tagsLabel} has no data.`
    : `${metricLabel} by ${tagsLabel}, ${words.length} ${
        words.length === 1 ? 'tag' : 'tags'
      }${
        largest.length
          ? `, largest ${largest
              .map(({ text, valueText }) => `${text} (${valueText})`)
              .join(', ')}`
          : ''
      }.`;

  return {
    kind: 'tagCloud',
    ...sceneBase(resolution, node),
    summary: titled(node.title, sentence),
    interactions,
    words,
    scale: node.scale ?? 'linear',
    angles: { ...ANGLES[node.orientation ?? 'single'] },
    fontSize: {
      min: node.fontSize?.min ?? FONT_SIZE.min,
      max: node.fontSize?.max ?? FONT_SIZE.max,
    },
    ...((node.showLabel ?? true) && !empty
      ? { label: `${tagsLabel} - ${metricLabel}` }
      : {}),
    ...(empty ? { empty } : {}),
  };
};
