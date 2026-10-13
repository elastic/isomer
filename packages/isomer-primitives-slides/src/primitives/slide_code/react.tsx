/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { codeLineMaxLength } from '../../theme/components/code';
import { slideDistillery } from '../../theme/distillery';
import { connectorModule, layoutModule } from '../../theme/modules';
import { slideLayout } from '../layout';
import { gutterColumns } from '../line_gutter';

import { codeIsDense } from './fit';
import {
  panelGutter,
  panelHighlights,
  panelLines,
  type SlideCodeNode,
  type SlideCodePanel,
} from './schema';
import { codeModule } from './styles';

const { label: connectorLabel } = slideDistillery.tokens.connector;

const Panel = ({
  panel,
  dense,
  context,
}: {
  panel: SlideCodePanel;
  dense: boolean;
  context: SlideReactEnv['context'];
}): ReactNode => {
  const { handles: code } = codeModule;
  const { file } = panel;
  const lines = panelLines(panel);
  const marked = panelHighlights(panel);
  const gutter = panelGutter(panel);
  const lineBox = dense ? code.denseLine : code.regularLine;
  return (
    <figure className={cls(context, code.figure)}>
      {file ? (
        <figcaption className={cls(context, code.file)}>{file}</figcaption>
      ) : null}
      <pre
        className={cls(context, code.panel, dense ? code.dense : code.regular)}>
        {lines.map((line, index) => (
          <Fragment key={index}>
            {/* `panel` collapses it: the line break is in the text, never drawn. */}
            {index > 0 ? '\n' : null}
            {marked.has(index) ? (
              <code
                className={cls(context, code.line, lineBox, code.highlight)}>
                {gutter ? (
                  <span aria-hidden className={cls(context, code.gutter)}>
                    {gutter[index]}
                  </span>
                ) : null}
                <mark className={cls(context, code.mark)}>{line}</mark>
              </code>
            ) : (
              <code className={cls(context, code.line, lineBox, code.plain)}>
                {gutter ? (
                  <span aria-hidden className={cls(context, code.gutter)}>
                    {gutter[index]}
                  </span>
                ) : null}
                {line}
              </code>
            )}
          </Fragment>
        ))}
      </pre>
    </figure>
  );
};

/** React renderer for {@link SlideCodeNode}. */
/** One panel, or two joined by an arrow, at one size so a trace reads at one scale. */
export const CodePanels = ({
  type,
  panels,
  context,
}: {
  type: string;
  panels: readonly SlideCodePanel[];
  context: SlideReactEnv['context'];
}): ReactNode => {
  const { handles: code } = codeModule;
  const { handles: connector } = connectorModule;
  const [first, second] = panels;
  const regularMax = codeLineMaxLength(
    second ? 2 : 1,
    false,
    slideLayout(context).width
  );
  const dense = codeIsDense(
    panels.map((panel) => ({
      lines: panelLines(panel),
      gutter: gutterColumns(panelGutter(panel)),
    })),
    regularMax
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div
        className={cls(context, code.grid, second ? code.pair : code.single)}>
        {first ? <Panel panel={first} {...{ context, dense }} /> : null}
        {second ? (
          <>
            <div
              role="img"
              aria-label={connectorLabel.value}
              className={cls(context, connector.across, connector.primary)}>
              <div className={cls(context, connector.railAcross)} />
              <div className={cls(context, connector.headRight)} />
            </div>
            <Panel panel={second} {...{ context, dense }} />
          </>
        ) : null}
      </div>
    </div>
  );
};

export const react = (
  node: SlideCodeNode,
  { context }: SlideReactEnv
): ReactNode => (
  <CodePanels type={node.type} panels={[node]} {...{ context }} />
);
