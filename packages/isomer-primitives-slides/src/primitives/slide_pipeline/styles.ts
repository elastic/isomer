/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { pipeline as pipelineTheme } from '../../theme/components/pipeline';
import { slideDistillery, toneVar } from '../../theme/distillery';
import { scalePx } from '../../theme/scale';
import { typeRole } from '../../theme/type_role';
import { slideSizes } from '../../theme/variants';

import { pipelineMaxSteps } from './schema';

const { createStyleModule, tokens } = slideDistillery;
const { color, pipeline } = tokens;
const { bracket, caption, chip, terminal } = pipeline;

/** Variant key for a count or grid line; keys must start with a letter. */
export const pipelineKey = (n: number): string => `n${n}`;

const valueOf = (key: string): number => Number(key.slice(1));

const range = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, index) =>
    pipelineKey(from + index)
  );

/** Chip counts spans mode lays out, as variant keys. */
export const pipelineChipCounts = range(2, pipelineMaxSteps);

/** Step counts steps mode lays out, as variant keys. */
export const pipelineStepCounts = pipelineChipCounts;

/** Half of one of `count` equal step columns: the inset to that column's center. */
// Expanded to two terms, since takumi does not evaluate a nested `calc`.
const halfColumn = (count: string): string => {
  const n = valueOf(count);
  const share = Number((50 / n).toFixed(4));
  const gaps = Number(
    ((scalePx(pipelineTheme.gap) * (n - 1)) / (2 * n)).toFixed(4)
  );
  return `calc(${share}% - ${gaps}px)`;
};

/** Spans-mode grid lines: a chip and a connector per step, less the last connector. */
export const pipelineTracks = range(1, 2 * pipelineMaxSteps - 1);

/** Distillate module for `slidePipeline`. */
export const pipelineModule = createStyleModule('pipeline', ({ css }) => ({
  steps: css`
    align-items: flex-start;
    display: flex;
  `,
  // Joins a terminal chip to the steps, across the gap between them.
  stub: css`
    background: ${color.line};
    flex: 0 0 auto;
    height: ${pipeline.rail};
    margin-top: ${pipeline.railTop};
    width: ${pipeline.gap};
  `,
  track: css`
    flex: 1;
    min-width: 0;
    position: relative;
  `,
  // Runs to the track's edge on a side with a terminal chip, else stops at the end circle.
  rail: css`
    background: ${color.line};
    height: ${pipeline.rail};
    left: 0;
    position: absolute;
    right: 0;
    top: ${pipeline.railTop};
  `,
  railFromFirst: variants(
    pipelineStepCounts,
    (count) => css`
      left: ${halfColumn(count)};
    `
  ),
  railToLast: variants(
    pipelineStepCounts,
    (count) => css`
      right: ${halfColumn(count)};
    `
  ),
  // Positioned so it paints above the rail.
  terminal: css`
    background: ${color.bgPage};
    border: ${terminal.border} solid ${color.text};
    border-radius: ${terminal.radius};
    color: ${color.text};
    display: flex;
    flex: 0 0 auto;
    ${typeRole(terminal.type)}
    padding: ${terminal.padding};
    position: relative;
    white-space: nowrap;
  `,
  list: css`
    display: flex;
    gap: ${pipeline.gap};
    list-style: none;
    margin: 0;
    padding: 0;
    position: relative;
  `,
  step: css`
    align-items: center;
    display: flex;
    flex: 1 1 0;
    flex-direction: column;
    min-width: 0;
    text-align: center;
  `,
  numeral: css`
    align-items: center;
    background: ${color.primary};
    border-radius: 50%;
    color: ${color.onPrimary};
    display: flex;
    ${typeRole(pipeline.numeral)}
    height: ${pipeline.circleSize};
    justify-content: center;
    width: ${pipeline.circleSize};
  `,
  titleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${pipeline.titleSizes[size]};
    `
  ),
  title: css`
    color: ${color.text};
    ${typeRole(pipeline.title)}
    margin: ${pipeline.titleGap} 0 0;
  `,
  bodySize: variants(
    slideSizes,
    (size) => css`
      font-size: ${pipeline.bodySizes[size]};
    `
  ),
  body: css`
    color: ${color.textSoft};
    ${typeRole(pipeline.body)}
    margin: ${pipeline.bodyGap} 0 0;
    text-wrap: balance;
  `,
  grid: css`
    display: grid;
  `,
  columns: variants(
    pipelineChipCounts,
    (count) => css`
      grid-template-columns:
        repeat(
          ${valueOf(count) - 1},
          auto minmax(${pipeline.connectorMin}, 1fr)
        )
        auto;
    `
  ),
  columnStart: variants(
    pipelineTracks,
    (line) => css`
      grid-column-start: ${valueOf(line)};
    `
  ),
  columnSpan: variants(
    pipelineTracks,
    (span) => css`
      grid-column-end: span ${valueOf(span)};
    `
  ),
  chip: css`
    background: ${color.bgSurface};
    border: ${chip.border} solid ${color.text};
    border-radius: ${chip.radius};
    color: ${color.text};
    display: flex;
    ${typeRole(chip.type)}
    grid-row: 1;
    padding: ${chip.padding};
    white-space: nowrap;
  `,
  connector: css`
    align-self: center;
    background: ${color.line};
    grid-row: 1;
    height: ${pipeline.rail};
  `,
  bracket: css`
    border: ${bracket.border} solid ${toneVar};
    border-radius: 0 0 ${bracket.radius} ${bracket.radius};
    border-top: none;
    grid-row: 2;
    height: ${bracket.height};
    margin-top: ${bracket.gap};
  `,
  caption: css`
    display: flex;
    flex-direction: column;
    gap: ${caption.itemGap};
    grid-row: 3;
    margin-top: ${caption.gap};
    min-width: 0;
    padding-right: ${caption.trailing};
  `,
  captionLabel: css`
    color: ${toneVar};
    ${typeRole(caption.label)}
    text-transform: uppercase;
  `,
  captionTitle: css`
    color: ${color.text};
    ${typeRole(caption.title)}
    margin: 0;
  `,
  captionBody: css`
    color: ${color.textSoft};
    ${typeRole(caption.body)}
    margin: 0;
    text-wrap: pretty;
  `,
}));
