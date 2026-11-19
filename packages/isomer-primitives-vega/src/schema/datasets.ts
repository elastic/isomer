/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isSpecObject, type SpecObject } from './spec';
import type { VegaMode } from './table';

/** Rows of one inline dataset, as the chart's own `format.property` reads them. */
export interface VegaDataset {
  name?: string;
  rows: readonly SpecObject[];
  fields: readonly string[];
}

/** The column Vega-Lite gives a dataset of bare values. */
const BARE_FIELD = 'data';

/** Follows `format.property`, the dotted path Vega reads rows from inside a JSON object. */
const atProperty = (values: unknown, format: unknown): unknown => {
  const property =
    isSpecObject(format) && typeof format.property === 'string'
      ? format.property
      : undefined;
  return property === undefined
    ? values
    : property
        .split('.')
        .reduce<unknown>(
          (value, key) => (isSpecObject(value) ? value[key] : undefined),
          values
        );
};

const toDataset = (source: unknown, name?: string): VegaDataset | undefined => {
  if (!isSpecObject(source)) {
    return undefined;
  }
  const values = atProperty(source.values, source.format);
  if (!Array.isArray(values)) {
    return undefined;
  }
  const rows = values.map((value: unknown) =>
    isSpecObject(value) ? value : { [BARE_FIELD]: value }
  );
  const fields = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  return { ...(name !== undefined && { name }), rows, fields };
};

/** Keys under which a Vega-Lite view holds child views. */
const CHILD_VIEWS = ['layer', 'concat', 'hconcat', 'vconcat'] as const;

/** Each `data` of a Vega-Lite view and its child views, in declaration order. */
const vegaLiteSources = (view: unknown, depth = 0): unknown[] => {
  if (!isSpecObject(view) || depth > 64) {
    return [];
  }
  const children = [
    ...CHILD_VIEWS.flatMap((key) =>
      Array.isArray(view[key]) ? (view[key] as unknown[]) : []
    ),
    // A facet's or repeat's view.
    view.spec,
  ];
  return [
    view.data,
    ...children.flatMap((child) => vegaLiteSources(child, depth + 1)),
  ];
};

/** Every inline dataset in the spec, in declaration order; a Vega-Lite dataset once, where a view first reads it. */
export const vegaDatasets = (
  mode: VegaMode,
  spec: SpecObject
): VegaDataset[] => {
  if (mode === 'vega') {
    const data = Array.isArray(spec.data) ? spec.data : [];
    return data.flatMap((source) => {
      const name =
        isSpecObject(source) && typeof source.name === 'string'
          ? source.name
          : undefined;
      return toDataset(source, name) ?? [];
    });
  }
  const datasets = isSpecObject(spec.datasets) ? spec.datasets : {};
  const named = new Set<string>();
  const read = (name: string): VegaDataset[] => {
    if (
      named.has(name) ||
      !Object.prototype.hasOwnProperty.call(datasets, name)
    ) {
      return [];
    }
    named.add(name);
    const dataset = toDataset({ values: datasets[name] }, name);
    return dataset ? [dataset] : [];
  };
  const inViews = vegaLiteSources(spec).flatMap((source) => {
    if (!isSpecObject(source)) {
      return [];
    }
    if (typeof source.name === 'string' && !('values' in source)) {
      return read(source.name);
    }
    return toDataset(source) ?? [];
  });
  return [...inViews, ...Object.keys(datasets).flatMap(read)];
};

/** The dataset a reader most likely wants: the first one with rows. */
export const primaryDataset = (
  mode: VegaMode,
  spec: SpecObject
): VegaDataset | undefined =>
  vegaDatasets(mode, spec).find(({ rows }) => rows.length > 0);

const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? '' : 's'}`;

/** `12 rows of region, sales`, or nothing for a chart without inline rows. */
export const describeDataset = ({ rows, fields }: VegaDataset): string =>
  `${plural(rows.length, 'row')} of ${fields.join(', ')}`;

/** A cell as one line of text; nested values print as JSON. */
export const cellText = (value: unknown): string => {
  if (value === null || value === undefined) {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  if (
    typeof value === 'number' ||
    typeof value === 'boolean' ||
    typeof value === 'bigint'
  ) {
    return String(value);
  }
  return JSON.stringify(value) ?? '';
};
