/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ScaleToken } from '@elastic/distillate';

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { sequence, sequenceFit } from '../../theme/components/sequence';
import { connector, tone as toneCue } from '../../theme/components/shared';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  lineFill,
  monoWidth,
  packedLines,
  proseLines,
  sizeForLoad,
} from '../size';

import type { SlideSequenceNode } from './schema';

const { actor } = sequence;

const lineHeight = (size: ScaleToken, leading: ScaleToken): number =>
  scalePx(size) * parseFloat(leading.value);

/** Lines of mono `text` at `size` across `width`, a word wider than it breaking across as many as it fills. */
const monoLines = (text: string, size: ScaleToken, width: number): number => {
  const words = text.split(/\s+/).filter(Boolean);
  const room = Math.max(1, width);
  return Math.max(
    packedLines(
      words.map((word) => monoWidth(word, size)),
      monoWidth(' ', size),
      room
    ),
    Math.ceil(monoWidth(words.join(' '), size) / room)
  );
};

/** The height a message row takes at `step` with a one-line label. */
const rowHeight = (step: SlideSize): number =>
  lineHeight(sequence.labelSizes[step], sequence.labelLineHeight) +
  scalePx(sequence.labelGaps[step]) +
  2 * scalePx(connector.headHalf) +
  scalePx(sequence.rowGaps[step]);

/** The height actor chips and message labels add at `step` across `width` by wrapping past one line. */
const wrapHeight = (
  { actors, messages }: Pick<SlideSequenceNode, 'actors' | 'messages'>,
  step: SlideSize,
  width: number
): number => {
  const column = width / actors.length;
  const actorLines = Math.max(
    ...actors.map(({ label, tone }) =>
      monoLines(
        label,
        actor.sizes[step],
        column -
          2 * (scalePx(actor.paddingX) + scalePx(actor.border)) -
          (tone ? scalePx(toneCue.cue.size) + scalePx(toneCue.cue.gap) : 0)
      )
    )
  );
  const indexOf = new Map(actors.map(({ id }, index) => [id, index]));
  const labelLines = messages.map(({ from, to, label }) => {
    const apart = Math.abs((indexOf.get(to) ?? 0) - (indexOf.get(from) ?? 0));
    const span =
      apart * column -
      (apart > 1 ? scalePx(sequence.labelOffset) : 0) -
      2 * scalePx(sequence.labelInset);
    return proseLines(
      stripMarks(label),
      scalePx(sequence.labelSizes[step]),
      Math.max(1, span) * lineFill
    );
  });
  return (
    (actorLines - 1) * lineHeight(actor.sizes[step], actor.type.lineHeight) +
    labelLines.reduce((total, lines) => total + lines - 1, 0) *
      lineHeight(sequence.labelSizes[step], sequence.labelLineHeight)
  );
};

/** Messages at `step`, plus what wrapped actors and labels add in message rows. */
export const sequenceLoad = (
  node: Pick<SlideSequenceNode, 'actors' | 'messages'>,
  step: SlideSize,
  width: number
): number =>
  node.messages.length + wrapHeight(node, step, width) / rowHeight(step);

/** The step a sequence draws at in `context`. */
export const sequenceStep = (
  node: SlideSequenceNode,
  context: SlideRenderContext | undefined
): SlideSize => {
  const { width, crowding } = slideLayout(context);
  return sizeForLoad(
    node.size,
    (step) => sequenceLoad(node, step, width),
    sequenceFit,
    crowding
  );
};
