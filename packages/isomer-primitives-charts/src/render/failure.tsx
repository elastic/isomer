/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import type { ChartNode, ChartsReactEnv } from './context';
import { cls } from './styles';
import { CHARTS_THEME } from './theme';
import { unsupportedModule } from './unsupported_styles';

/** What every surface writes in place of a chart that could not be resolved or drawn. */
export const CHART_FAILURE_TEXT = 'This chart could not be drawn.';

/** The height a `snapshot` frame reserves for a failure note, in pixels. */
export const FAILURE_HEIGHT = CHARTS_THEME.unsupported.height;

/** Told of each chart that drew its failure note, once for each node a render draws. */
export type ChartFailureHandler = (error: unknown, node: ChartNode) => void;

/** Runs `draw`, and `fallback` when it throws, reporting the error once per node. */
export interface FailureGuard {
  <T>(node: ChartNode, draw: () => T, fallback: () => T): T;
}

export const createFailureGuard = (
  onFailure: ChartFailureHandler | undefined
): FailureGuard => {
  const reported = new WeakSet<ChartNode>();
  return (node, draw, fallback) => {
    try {
      return draw();
    } catch (error) {
      if (onFailure && !reported.has(node)) {
        reported.add(node);
        onFailure(error, node);
      }
      return fallback();
    }
  };
};

/** The failure text, led by the node's title when it has one. */
export const failureText = ({ title }: ChartNode): string =>
  title ? `${title}: ${CHART_FAILURE_TEXT}` : CHART_FAILURE_TEXT;

const { handles: note } = unsupportedModule;

/** The failure note, in the node's anchor. */
export const renderFailure = (
  node: ChartNode,
  { context }: Pick<ChartsReactEnv, 'context'>
): ReactNode => (
  <div
    {...nodeAnchor(context, node)}
    role="note"
    className={cls(context, note.root)}>
    {node.title && (
      <strong className={cls(context, note.title)}>{node.title}</strong>
    )}
    <span className={cls(context, note.body)}>{CHART_FAILURE_TEXT}</span>
  </div>
);
