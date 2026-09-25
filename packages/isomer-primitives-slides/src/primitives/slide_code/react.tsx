/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { connectorModule, layoutModule } from '../../theme/modules';

import type { SlideCodeNode, SlideCodePanel } from './schema';
import { codeModule } from './styles';

const denseAfterLines = 10;

const Panel = ({
  panel: { file, highlight = [], lines },
  dense,
  context,
}: {
  panel: SlideCodePanel;
  dense: boolean;
  context: SlideReactEnv['context'];
}): ReactNode => {
  const { handles: code } = codeModule;
  const marked = new Set(highlight);
  return (
    <figure className={cls(context, code.figure)}>
      {file ? (
        <figcaption className={cls(context, code.file)}>{file}</figcaption>
      ) : null}
      <pre
        className={cls(context, code.panel, dense ? code.dense : code.regular)}>
        {lines.map((line, index) => (
          <code
            className={cls(
              context,
              code.line,
              marked.has(index + 1) ? code.highlight : code.plain
            )}
            key={index}>
            {line === '' ? ' ' : line}
          </code>
        ))}
      </pre>
    </figure>
  );
};

/** React renderer for {@link SlideCodeNode}. */
export const react = (
  { panels }: SlideCodeNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: code } = codeModule;
  const { handles: connector } = connectorModule;
  const [first, second] = panels;
  // One size for both panels, so a trace reads at one scale.
  const dense = panels.some(({ lines }) => lines.length > denseAfterLines);
  return (
    <div className={cls(context, layoutModule.handles.fill)}>
      <div
        className={cls(context, code.grid, second ? code.pair : code.single)}>
        {first ? <Panel panel={first} {...{ context, dense }} /> : null}
        {second ? (
          <>
            <div
              aria-hidden
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
