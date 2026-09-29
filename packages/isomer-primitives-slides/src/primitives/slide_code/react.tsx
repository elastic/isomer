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
import { codeDenseAfter } from '../../theme/components/code';
import { slideDistillery } from '../../theme/distillery';
import { connectorModule, layoutModule } from '../../theme/modules';

import type { SlideCodeNode, SlideCodePanel } from './schema';
import { codeModule } from './styles';

const { label: connectorLabel } = slideDistillery.tokens.connector;

const Panel = ({
  panel: { file, highlightLines = [], lines },
  dense,
  context,
}: {
  panel: SlideCodePanel;
  dense: boolean;
  context: SlideReactEnv['context'];
}): ReactNode => {
  const { handles: code } = codeModule;
  const marked = new Set(highlightLines);
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
            {marked.has(index + 1) ? (
              <code className={cls(context, code.line, code.highlight)}>
                <mark className={cls(context, code.mark)}>{line}</mark>
              </code>
            ) : (
              <code className={cls(context, code.line, code.plain)}>
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
export const react = (
  { type, panels }: SlideCodeNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: code } = codeModule;
  const { handles: connector } = connectorModule;
  const [first, second] = panels;
  // One size for both panels, so a trace reads at one scale.
  const dense = panels.some(({ lines }) => lines.length > codeDenseAfter);
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
