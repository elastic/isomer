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
import { countKeys, countOf, slideSizes } from '../../theme/variants';

import { pipelineMaxSteps } from './schema';

const { createStyleModule, tokens } = slideDistillery;
const { color, pipeline } = tokens;
const { bracket, caption, chip, terminal } = pipeline;

const stepCounts = countKeys(2, pipelineMaxSteps);

/** A chip and a connector per step, less the last connector. */
const tracks = countKeys(1, 2 * pipelineMaxSteps - 1);

/** Half of one of `count` equal columns: the inset to its center. */
// Two terms, since takumi does not evaluate a nested `calc`.
const halfColumn = (count: string): string => {
  const n = countOf(count);
  const share = Number((50 / n).toFixed(4));
  const gaps = Number(
    ((scalePx(pipelineTheme.gap) * (n - 1)) / (2 * n)).toFixed(4)
  );
  return `calc(${share}% - ${gaps}px)`;
};

export const pipelineModule = createStyleModule('pipeline', ({ css }) => ({
  steps: css`
    align-items: flex-start;
    display: flex;
  `,
  // Joins a terminal chip to the steps, across the gap.
  stub: css`
    background: ${color.line};
    flex: 0 0 auto;
    height: ${pipeline.rail};
    margin-top: ${pipeline.railTop};
    width: ${pipeline.gap};
  `,
  // Never narrower than its steps, so terminals too wide for the row push it past its room.
  track: css`
    flex: 1;
    position: relative;
  `,
  // Runs to the track's edge beside a terminal chip, else stops at the end circle.
  rail: css`
    background: ${color.line};
    height: ${pipeline.rail};
    left: 0;
    position: absolute;
    right: 0;
    top: ${pipeline.railTop};
  `,
  railFromFirst: variants(
    stepCounts,
    (count) => css`
      left: ${halfColumn(count)};
    `
  ),
  railToLast: variants(
    stepCounts,
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
  title: css`
    color: ${color.text};
    ${typeRole(pipeline.title)}
    margin: ${pipeline.titleGap} 0 0;
  `,
  titleSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${pipeline.titleSizes[size]};
    `
  ),
  body: css`
    color: ${color.textSoft};
    ${typeRole(pipeline.body)}
    margin: ${pipeline.bodyGap} 0 0;
    text-wrap: balance;
  `,
  bodySize: variants(
    slideSizes,
    (size) => css`
      font-size: ${pipeline.bodySizes[size]};
    `
  ),
  grid: css`
    display: grid;
  `,
  columns: variants(
    stepCounts,
    (count) => css`
      grid-template-columns:
        repeat(
          ${countOf(count) - 1},
          auto minmax(${pipeline.connectorMin}, 1fr)
        )
        auto;
    `
  ),
  columnStart: variants(
    tracks,
    (line) => css`
      grid-column-start: ${countOf(line)};
    `
  ),
  columnSpan: variants(
    tracks,
    (span) => css`
      grid-column-end: span ${countOf(span)};
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
