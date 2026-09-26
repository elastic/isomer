/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery, toneVar } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideSizes } from '../../theme/variants';

import { sequenceMaxActors, sequenceMaxMessages } from './schema';

const { createStyleModule, tokens } = slideDistillery;
const { color, font, sequence } = tokens;
const { actor } = sequence;

/** Variant key for a count or grid line; keys must start with a letter. */
export const sequenceKey = (n: number): string => `n${n}`;

const valueOf = (key: string): number => Number(key.slice(1));

const range = (from: number, to: number): string[] =>
  Array.from({ length: to - from + 1 }, (_, index) =>
    sequenceKey(from + index)
  );

const actorCounts = range(3, sequenceMaxActors);
const messageCounts = range(1, sequenceMaxMessages);
const columnLines = range(1, 2 * sequenceMaxActors);
const spans = range(1, 2 * sequenceMaxActors);
const rowLines = range(1, sequenceMaxMessages + 1);

/** Distillate module for `slideSequence`. */
export const sequenceModule = createStyleModule('sequence', ({ css }) => ({
  grid: css`
    display: grid;
  `,
  // Two tracks per actor, so each actor's center is a grid line.
  columns: variants(
    actorCounts,
    (count) => css`
      grid-template-columns: repeat(${2 * valueOf(count)}, minmax(0, 1fr));
    `
  ),
  // The actor row, then one row per message.
  rows: variants(
    messageCounts,
    (count) => css`
      grid-template-rows: repeat(${valueOf(count) + 1}, auto);
    `
  ),
  gapSize: variants(
    slideSizes,
    (size) => css`
      row-gap: ${sequence.rowGaps[size]};
    `
  ),
  row: variants(
    rowLines,
    (line) => css`
      grid-row: ${valueOf(line)};
    `
  ),
  columnStart: variants(
    columnLines,
    (line) => css`
      grid-column-start: ${valueOf(line)};
    `
  ),
  columnSpan: variants(
    spans,
    (span) => css`
      grid-column-end: span ${valueOf(span)};
    `
  ),
  lifeline: css`
    border-left: ${sequence.lifeline} solid ${color.border};
    grid-row: 1 / -1;
    justify-self: center;
    width: 0;
  `,
  actor: css`
    background: ${actor.fill};
    border: ${actor.border} solid ${color.text};
    border-radius: ${actor.radius};
    color: ${color.text};
    display: flex;
    ${typeRole(actor.type)}
    justify-self: center;
    margin: 0 0 ${actor.gap};
    padding: ${actor.padding};
    white-space: nowrap;
  `,
  actorToned: css`
    border-color: ${toneVar};
    color: ${toneVar};
  `,
  message: css`
    align-items: center;
    display: flex;
    flex-direction: column;
    min-width: 0;
  `,
  messageSize: variants(
    slideSizes,
    (size) => css`
      gap: ${sequence.labelGaps[size]};
    `
  ),
  // A message that skips an actor sets its label by the sender, off the skipped lifeline.
  labelFromStart: css`
    align-self: flex-start;
    margin-left: ${sequence.labelOffset};
  `,
  labelFromEnd: css`
    align-self: flex-end;
    margin-right: ${sequence.labelOffset};
  `,
  label: css`
    background: ${sequence.labelFill};
    color: ${color.text};
    line-height: ${sequence.labelLineHeight};
    padding: 0 ${sequence.labelInset};
    white-space: nowrap;
  `,
  labelSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${sequence.labelSizes[size]};
    `
  ),
  labelToned: css`
    color: ${toneVar};
  `,
  labelMono: css`
    font-family: ${font.family.mono};
  `,
  arrow: css`
    align-self: stretch;
  `,
}));
