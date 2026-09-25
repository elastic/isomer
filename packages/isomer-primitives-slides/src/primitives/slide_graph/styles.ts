/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideSizes } from '../../theme/variants';

import { graphMaxMain } from './schema';

const { createStyleModule, tokens } = slideDistillery;
const { color, graph } = tokens;
const { node } = graph;

/** Variant key for a count or grid line; keys must start with a letter. */
export const graphKey = (n: number): string => `n${n}`;

const valueOf = (key: string): number => Number(key.slice(1));

const range = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, index) => graphKey(from + index));

/** Main-row sizes, as variant keys. */
export const graphMainCounts = range(2, graphMaxMain);

/** Grid lines: a node and a connector per main-row node, less the last connector. */
export const graphTracks = range(1, 2 * graphMaxMain - 1);

/** The five grid rows, top to bottom. */
export const graphRows = ['above', 'upper', 'main', 'lower', 'below'] as const;

/** Distillate module for `slideGraph`. */
export const graphModule = createStyleModule('graph', ({ css }) => ({
  grid: css`
    display: grid;
  `,
  columns: variants(
    graphMainCounts,
    (count) => css`
      grid-template-columns:
        repeat(${valueOf(count) - 1}, minmax(0, 1fr) ${graph.track})
        minmax(0, 1fr);
    `
  ),
  row: variants(
    graphRows,
    (row) => css`
      grid-row: ${graphRows.indexOf(row) + 1};
    `
  ),
  columnStart: variants(
    graphTracks,
    (line) => css`
      grid-column-start: ${valueOf(line)};
    `
  ),
  columnSpan: variants(
    graphTracks,
    (span) => css`
      grid-column-end: span ${valueOf(span)};
    `
  ),
  columnRest: css`
    grid-column-end: -1;
  `,
  nodeSize: variants(
    slideSizes,
    (size) => css`
      padding: ${node.paddings[size]};
    `
  ),
  node: css`
    background: ${node.fill};
    border-radius: ${node.radius};
    display: flex;
    flex-direction: column;
    gap: ${node.gap};
    min-width: 0;
    padding: ${node.padding};
  `,
  nodePlain: css`
    border: ${node.border} solid ${color.border};
  `,
  nodeEmphasis: css`
    border: ${node.emphasisBorder} solid ${color.primary};
  `,
  termSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${graph.termSizes[size]};
    `
  ),
  term: css`
    ${typeRole(graph.term)}
    margin: 0;
  `,
  termPlain: css`
    color: ${color.text};
  `,
  termEmphasis: css`
    color: ${color.primary};
  `,
  bodySize: variants(
    slideSizes,
    (size) => css`
      font-size: ${graph.bodySizes[size]};
    `
  ),
  body: css`
    color: ${color.textSoft};
    ${typeRole(graph.body)}
    margin: 0;
    text-wrap: pretty;
  `,
  across: css`
    padding: 0 ${graph.connectorInset};
  `,
  downSize: variants(
    slideSizes,
    (size) => css`
      height: ${graph.rows[size]};
    `
  ),
  down: css`
    box-sizing: border-box;
    height: ${graph.row};
    padding: ${graph.connectorInset} 0;
  `,
  captionSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${graph.captionSizes[size]};
    `
  ),
  caption: css`
    align-self: end;
    color: ${color.textSoft};
    ${typeRole(graph.caption)}
    max-width: ${graph.captionMaxWidth};
    text-wrap: pretty;
  `,
  captionBeside: css`
    margin: 0;
  `,
  // With no node above, the caption keeps the connector row's space below it.
  captionAlone: css`
    margin: 0 0 ${graph.row};
  `,
}));
