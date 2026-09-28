/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv, SlideRenderContext } from '../../render/context';
import { marksReact, stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { graphFit } from '../../theme/components/graph';
import { connectorModule, layoutModule } from '../../theme/modules';
import type { SlideSize } from '../../theme/variants';
import { sizeForLoad } from '../size';

import { type GraphBranch, graphLayout } from './layout';
import type { SlideGraphNode, SlideGraphTerm } from './schema';
import { graphKey, graphModule, type graphRows } from './styles';

const { handles: graph } = graphModule;
const { handles: connector } = connectorModule;

type Row = (typeof graphRows)[number];
type Context = SlideRenderContext | undefined;

/** Grid line of main-row node `index`: each node is a track followed by a connector track. */
const nodeLine = (index: number): number => 2 * index + 1;

const at = (row: Row, line: number) => [
  graph.row[row],
  graph.columnStart[graphKey(line)],
];

const Term = ({
  term: { term, body, emphasis },
  row,
  line,
  step,
  context,
}: {
  term: SlideGraphTerm;
  row: Row;
  line: number;
  step: SlideSize;
  context: Context;
}) => (
  <div
    className={cls(
      context,
      graph.node,
      graph.nodeSize[step],
      emphasis ? graph.nodeEmphasis : graph.nodePlain,
      ...at(row, line)
    )}>
    <h3
      className={cls(
        context,
        graph.term,
        graph.termSize[step],
        emphasis ? graph.termEmphasis : graph.termPlain
      )}>
      {term}
    </h3>
    <p className={cls(context, graph.body, graph.bodySize[step])}>
      {marksReact(body, context)}
    </p>
  </div>
);

/** A vertical connector whose head points down when `down`, up otherwise. */
const Vertical = ({
  row,
  line,
  down,
  step,
  context,
}: {
  row: Row;
  line: number;
  down: boolean;
  step: SlideSize;
  context: Context;
}) => (
  <div
    aria-hidden
    className={cls(
      context,
      connector.down,
      graph.down,
      graph.downSize[step],
      ...at(row, line)
    )}>
    {down ? null : <span className={cls(context, connector.headUp)} />}
    <span className={cls(context, connector.railDown)} />
    {down ? <span className={cls(context, connector.headDown)} /> : null}
  </div>
);

const Branch = ({
  branch: { term, at: index, inward },
  side,
  step,
  context,
}: {
  branch: GraphBranch;
  side: 'above' | 'below';
  step: SlideSize;
  context: Context;
}) => {
  const line = nodeLine(index);
  const above = side === 'above';
  return (
    <>
      <Term {...{ term, line, step, context }} row={side} />
      <Vertical
        {...{ line, step, context }}
        row={above ? 'upper' : 'lower'}
        down={above === inward}
      />
    </>
  );
};

const Caption = ({
  caption,
  above,
  step,
  context,
}: {
  caption: string;
  above: GraphBranch | undefined;
  step: SlideSize;
  context: Context;
}) => {
  const placement =
    above === undefined
      ? [graph.columnStart[graphKey(1)], graph.columnRest, graph.captionAlone]
      : above.at === 0
        ? [
            graph.columnStart[graphKey(3)],
            graph.columnRest,
            graph.captionBeside,
          ]
        : [
            graph.columnStart[graphKey(1)],
            graph.columnSpan[graphKey(nodeLine(above.at) - 2)],
            graph.captionBeside,
          ];
  return (
    <p
      className={cls(
        context,
        graph.caption,
        graph.captionSize[step],
        graph.row.above,
        ...placement
      )}>
      {marksReact(caption, context)}
    </p>
  );
};

/** React renderer for {@link SlideGraphNode}. */
export const react = (
  node: SlideGraphNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, caption, size } = node;
  const { main, above, below } = graphLayout(node);
  const rows = [main, above, below].filter((row) => row !== undefined).length;
  const longest = Math.max(
    ...node.nodes.map(
      ({ term, body }) =>
        displayColumns(term) + displayColumns(stripMarks(body))
    )
  );
  const step = sizeForLoad(
    size,
    rows * longest + (caption ? displayColumns(stripMarks(caption)) : 0),
    graphFit,
    context?.crowding
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div
        className={cls(
          context,
          graph.grid,
          graph.columns[graphKey(main.length)]
        )}>
        {caption ? <Caption {...{ caption, above, step, context }} /> : null}
        {above ? (
          <Branch branch={above} side="above" {...{ step, context }} />
        ) : null}
        {main.map((term, index) => (
          <Fragment key={term.id}>
            {index > 0 ? (
              <div
                aria-hidden
                className={cls(
                  context,
                  connector.across,
                  graph.across,
                  ...at('main', nodeLine(index) - 1)
                )}>
                <span className={cls(context, connector.railAcross)} />
                <span className={cls(context, connector.headRight)} />
              </div>
            ) : null}
            <Term
              {...{ term, step, context }}
              row="main"
              line={nodeLine(index)}
            />
          </Fragment>
        ))}
        {below ? (
          <Branch branch={below} side="below" {...{ step, context }} />
        ) : null}
      </div>
    </div>
  );
};
