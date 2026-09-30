/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';
import { oneLine } from '@elastic/isomer-sdk/author';

import { cls } from '../../render/cls';
import type { SlideReactEnv, SlideRenderContext } from '../../render/context';
import { marksReact } from '../../render/marks';
import { ToneCue } from '../../render/tone_cue';
import { slideDistillery } from '../../theme/distillery';
import { connectorModule, layoutModule } from '../../theme/modules';
import { countKey, type SlideSize } from '../../theme/variants';

import { graphStep } from './fit';
import { type GraphBranch, graphLayout } from './layout';
import type { SlideGraphNode, SlideGraphTerm } from './schema';
import { graphModule, type graphRows } from './styles';

const { handles: graph } = graphModule;
const { handles: connector } = connectorModule;
const { label: leadsTo } = slideDistillery.tokens.connector;
const { toneLabel: labels } = slideDistillery.tokens.graph;

type Row = (typeof graphRows)[number];
type Context = SlideRenderContext | undefined;

/** Each node is a track, then a connector track. */
const nodeLine = (index: number): number => 2 * index + 1;

const at = (row: Row, line: number) => [
  graph.row[row],
  graph.columnStart[countKey(line)],
];

const relation = (from: SlideGraphTerm, to: SlideGraphTerm): string =>
  oneLine(`${from.term} ${leadsTo.value} ${to.term}`);

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
    <p
      className={cls(
        context,
        graph.term,
        graph.termSize[step],
        emphasis ? graph.termEmphasis : graph.termPlain
      )}>
      <ToneCue
        tone={emphasis ? 'primary' : undefined}
        {...{ context, labels }}
      />
      {term}
    </p>
    <p className={cls(context, graph.body, graph.bodySize[step])}>
      {marksReact(body, context)}
    </p>
  </div>
);

const Branch = ({
  branch: { term, at: index, inward },
  main,
  side,
  step,
  context,
}: {
  branch: GraphBranch;
  main: SlideGraphTerm[];
  side: 'above' | 'below';
  step: SlideSize;
  context: Context;
}) => {
  const line = nodeLine(index);
  const above = side === 'above';
  const down = above === inward;
  const joined = main[index];
  return (
    <>
      <Term {...{ term, line, step, context }} row={side} />
      <div
        role="img"
        aria-label={
          joined === undefined
            ? undefined
            : inward
              ? relation(term, joined)
              : relation(joined, term)
        }
        className={cls(
          context,
          connector.down,
          graph.down,
          graph.downSize[step],
          ...at(above ? 'upper' : 'lower', line)
        )}>
        {down ? null : <span className={cls(context, connector.headUp)} />}
        <span className={cls(context, connector.railDown)} />
        {down ? <span className={cls(context, connector.headDown)} /> : null}
      </div>
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
      ? [
          graph.columnStart[countKey(1)],
          graph.columnRest,
          graph.captionAlone[step],
        ]
      : above.at === 0
        ? [
            graph.columnStart[countKey(3)],
            graph.columnRest,
            graph.captionBeside,
          ]
        : [
            graph.columnStart[countKey(1)],
            graph.columnSpan[countKey(nodeLine(above.at) - 2)],
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
  const { type, caption } = node;
  const { main, above, below } = graphLayout(node);
  const step = graphStep(node, context);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div
        className={cls(
          context,
          graph.grid,
          graph.columns[countKey(main.length)]
        )}>
        {caption ? <Caption {...{ caption, above, step, context }} /> : null}
        {above ? (
          <Branch branch={above} side="above" {...{ main, step, context }} />
        ) : null}
        {main.map((term, index) => {
          const previous = main[index - 1];
          return (
            <Fragment key={term.id}>
              {previous ? (
                <div
                  role="img"
                  aria-label={relation(previous, term)}
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
          );
        })}
        {below ? (
          <Branch branch={below} side="below" {...{ main, step, context }} />
        ) : null}
      </div>
    </div>
  );
};
