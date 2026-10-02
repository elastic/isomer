/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { frameContentWidth } from '../../theme/components/frame';
import { pipeline, pipelineFit } from '../../theme/components/pipeline';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  lineFill,
  measureText,
  narrowing,
  rowLoad,
  sizeForLoad,
  trackWidth,
  widestWord,
} from '../size';

import type { SlidePipelineNode } from './schema';

const { terminal } = pipeline;

/** A terminal chip and the stub joining it to the steps. */
const terminalWidth = (text: string): number =>
  measureText(text, terminal.type).widest +
  2 * (scalePx(terminal.paddingX) + scalePx(terminal.border)) +
  scalePx(pipeline.gap);

type Shape = Pick<SlidePipelineNode, 'start' | 'end' | 'steps'>;

const terminalsWidth = ({ start, end }: Shape): number =>
  [start, end].reduce(
    (total, text) => total + (text ? terminalWidth(text) : 0),
    0
  );

/** {@link rowLoad} of the steps, scaled by how many times over their columns fall short of the frame body; unbounded at a step where a title's widest word outgrows its column. */
export const pipelineLoad = (
  shape: Shape,
  step: SlideSize,
  width = frameContentWidth
): number => {
  const { steps } = shape;
  const column = trackWidth(
    width - terminalsWidth(shape),
    steps.map(() => 1),
    pipeline.gap
  );
  if (
    steps.some(
      ({ title }) =>
        widestWord(title, pipeline.title.tracking) *
          scalePx(pipeline.titleSizes[step]) >
        column * lineFill
    )
  ) {
    return Infinity;
  }
  return (
    rowLoad(steps.map(({ title, body }) => [title, body && stripMarks(body)])) *
    narrowing(frameContentWidth, column * steps.length)
  );
};

/** The step a steps-mode pipeline draws at in `context`. */
export const pipelineStep = (
  node: SlidePipelineNode,
  context: SlideRenderContext | undefined
): SlideSize => {
  const { width, crowding } = slideLayout(context);
  return sizeForLoad(
    node.size,
    (step) => pipelineLoad(node, step, width),
    pipelineFit,
    crowding
  );
};
