/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { monoAdvance } from '../../theme/base';
import { frameContentWidth } from '../../theme/components/frame';
import { pipeline, pipelineFit } from '../../theme/components/pipeline';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { lineFill, rowLoad, sizeForLoad, widestWord } from '../size';

import type { SlidePipelineNode } from './schema';

const { terminal } = pipeline;

/** A terminal chip and the stub joining it to the steps. */
const terminalWidth = (text: string): number =>
  displayColumns(text) * monoAdvance * scalePx(terminal.type.size) +
  2 * (scalePx(terminal.paddingX) + scalePx(terminal.border)) +
  scalePx(pipeline.gap);

type Shape = Pick<SlidePipelineNode, 'start' | 'end' | 'steps'>;

/** Width of all step columns together, less the gaps between them. */
const columnsWidth = ({ start, end, steps }: Shape, width: number): number =>
  Math.max(
    1,
    width -
      [start, end].reduce(
        (total, text) => total + (text ? terminalWidth(text) : 0),
        0
      ) -
      scalePx(pipeline.gap) * (steps.length - 1)
  );

/** {@link rowLoad} of the steps, as if their columns filled the frame body; unbounded at a step where a title's widest word outgrows its column. */
export const pipelineLoad = (
  shape: Shape,
  step: SlideSize,
  width = frameContentWidth
): number => {
  const { steps } = shape;
  const columns = columnsWidth(shape, width);
  if (
    steps.some(
      ({ title }) =>
        widestWord(title, pipeline.title.tracking) *
          scalePx(pipeline.titleSizes[step]) >
        (columns / steps.length) * lineFill
    )
  ) {
    return Infinity;
  }
  return (
    (rowLoad(
      steps.map(({ title, body }) => [title, body && stripMarks(body)])
    ) *
      frameContentWidth) /
    columns
  );
};

/** The step a steps-mode pipeline draws at in `context`. */
export const pipelineStep = (
  node: SlidePipelineNode,
  context: SlideRenderContext | undefined
): SlideSize =>
  sizeForLoad(
    node.size,
    (step) => pipelineLoad(node, step, context?.width),
    pipelineFit,
    context?.crowding
  );
