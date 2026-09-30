/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SlideRenderContext } from '../../render/context';
import { stripMarks } from '../../render/marks';
import { graph, graphFit } from '../../theme/components/graph';
import { tone } from '../../theme/components/shared';
import { scalePx } from '../../theme/scale';
import type { SlideSize } from '../../theme/variants';
import { slideLayout } from '../layout';
import {
  sizeForWidthLoad,
  sizeForWords,
  smallerStep,
  textColumns,
  trackWidth,
} from '../size';

import { captionNodes, type GraphLayout, graphLayout } from './layout';
import type { SlideGraphNode } from './schema';

export const graphLoad = (node: SlideGraphNode): number => {
  const { main, above, below } = graphLayout(node);
  const rows = [main, above, below].filter((row) => row !== undefined).length;
  const longest = Math.max(
    ...node.nodes.map(
      ({ term, body }) => textColumns(term) + textColumns(stripMarks(body))
    )
  );
  return (
    rows * longest + (node.caption ? textColumns(stripMarks(node.caption)) : 0)
  );
};

const cueWidth = scalePx(tone.cue.size) + scalePx(tone.cue.gap);

const nodeTrack = ({ main }: GraphLayout, width: number): number =>
  trackWidth(
    width,
    main.map(() => 1),
    graph.track
  );

/** The width the caption is set in across a layout `width` wide: the tracks it spans, up to its measure. */
export const graphCaptionWidth = (
  node: SlideGraphNode,
  width: number
): number => {
  const layout = graphLayout(node);
  const [first, last] = captionNodes(layout);
  const spanned = last - first + 1;
  return Math.min(
    spanned * nodeTrack(layout, width) + (spanned - 1) * scalePx(graph.track),
    scalePx(graph.captionMaxWidth)
  );
};

/** The largest step at which no word of a term, body, or the caption is wider than its node or span. */
export const graphWordStep = (
  node: SlideGraphNode,
  width: number
): SlideSize => {
  const inner =
    nodeTrack(graphLayout(node), width) -
    2 * (scalePx(graph.node.paddingX.l) + scalePx(graph.node.emphasisBorder));
  return [
    ...node.nodes.flatMap(({ term, body, emphasis }) => [
      sizeForWords(
        term,
        graph.term,
        graph.termSizes,
        inner - (emphasis ? cueWidth : 0)
      ),
      sizeForWords(stripMarks(body), graph.body, graph.bodySizes, inner),
    ]),
    ...(node.caption
      ? [
          sizeForWords(
            stripMarks(node.caption),
            graph.caption,
            graph.captionSizes,
            graphCaptionWidth(node, width)
          ),
        ]
      : []),
  ].reduce(smallerStep, 'l');
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
