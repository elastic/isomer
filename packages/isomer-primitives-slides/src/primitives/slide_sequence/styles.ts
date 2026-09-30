/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery, toneVar } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { countKeys, countOf, slideSizes } from '../../theme/variants';

import { sequenceMaxActors, sequenceMaxMessages } from './schema';

const { createStyleModule, tokens } = slideDistillery;
const { color, sequence } = tokens;
const { actor } = sequence;

const gridLines = countKeys(1, 2 * sequenceMaxActors);
const rowLines = countKeys(1, sequenceMaxMessages + 1);

export const sequenceModule = createStyleModule('sequence', ({ css }) => ({
  grid: css`
    display: grid;
  `,
  // Two tracks per actor, so each actor's center is a grid line.
  columns: variants(
    countKeys(3, sequenceMaxActors),
    (count) => css`
      grid-template-columns: repeat(${2 * countOf(count)}, minmax(0, 1fr));
    `
  ),
  rows: variants(
    countKeys(1, sequenceMaxMessages),
    (count) => css`
      grid-template-rows: repeat(${countOf(count) + 1}, auto);
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
      grid-row: ${countOf(line)};
    `
  ),
  columnStart: variants(
    gridLines,
    (line) => css`
      grid-column-start: ${countOf(line)};
    `
  ),
  columnSpan: variants(
    gridLines,
    (span) => css`
      grid-column-end: span ${countOf(span)};
    `
  ),
  lifeline: css`
    border-left: ${sequence.lifeline} solid ${color.border};
    grid-row: 1 / -1;
    justify-self: center;
    width: 0;
  `,
  // Wraps within its two tracks, so a long label never runs onto its neighbor's.
  actor: css`
    align-items: center;
    background: ${color.bgPage};
    border: ${actor.border} solid ${color.text};
    border-radius: ${actor.radius};
    color: ${color.text};
    display: flex;
    ${typeRole(actor.type)}
    align-self: start;
    justify-self: center;
    max-width: 100%;
    text-align: center;
  `,
  actorSize: variants(
    slideSizes,
    (size) => css`
      font-size: ${actor.sizes[size]};
      margin: 0 0 ${actor.gaps[size]};
      padding: ${actor.paddings[size]};
    `
  ),
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
    max-width: calc(100% - ${sequence.labelOffset});
  `,
  labelFromEnd: css`
    align-self: flex-end;
    margin-right: ${sequence.labelOffset};
    max-width: calc(100% - ${sequence.labelOffset});
  `,
  // The fill masks the lifelines a label crosses; it wraps within its message's span.
  label: css`
    background: ${color.bgPage};
    color: ${color.text};
    line-height: ${sequence.labelLineHeight};
    max-width: 100%;
    padding: 0 ${sequence.labelInset};
    text-align: center;
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
  arrow: css`
    align-self: stretch;
  `,
}));
