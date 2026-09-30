/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { graph, graphFit } from '../../theme/components/graph';
import { tone } from '../../theme/components/shared';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  sizeForLines,
  sizeForWidthLoad,
  smallerStep,
  trackWidth,
} from '../size';

import { graphLayout } from './layout';
import type { SlideGraphNode } from './schema';

export const graphLoad = (node: SlideGraphNode): number => {
  const { main, above, below } = graphLayout(node);
  const rows = [main, above, below].filter((row) => row !== undefined).length;
  const longest = Math.max(
    ...node.nodes.map(
      ({ term, body }) =>
        displayColumns(term) + displayColumns(stripMarks(body))
    )
  );
  return (
    rows * longest +
    (node.caption ? displayColumns(stripMarks(node.caption)) : 0)
  );
};

const cueWidth = scalePx(tone.cue.size) + scalePx(tone.cue.gap);

/** The largest step at which no word of a term or body is wider than its node. */
export const graphWordStep = (
  node: SlideGraphNode,
  width: number
): SlideSize => {
  const { main } = graphLayout(node);
  const inner =
    trackWidth(
      width,
      main.map(() => 1),
      graph.track
    ) -
    2 * (scalePx(graph.node.paddingX.l) + scalePx(graph.node.emphasisBorder));
  return node.nodes.reduce<SlideSize>(
    (step, { term, body, emphasis }) =>
      smallerStep(
        step,
        smallerStep(
          sizeForLines(
            undefined,
            term,
            graph.term.tracking,
            inner - (emphasis ? cueWidth : 0),
            graph.termSizes,
            Infinity
          ),
          sizeForLines(
            undefined,
            stripMarks(body),
            graph.body.tracking,
            inner,
            graph.bodySizes,
            Infinity
          )
        )
      ),
    'l'
  );
};

export const graphStep = (
  node: SlideGraphNode,
  context: SlideRenderContext | undefined
): SlideSize => {
  const layout = slideLayout(context);
  return (
    node.size ??
    smallerStep(
      sizeForWidthLoad(
        undefined,
        graphLoad(node),
        graphFit,
        layout,
        scalePx(graph.track) * (graphLayout(node).main.length - 1)
      ),
      graphWordStep(node, layout.width)
    )
  );
};
