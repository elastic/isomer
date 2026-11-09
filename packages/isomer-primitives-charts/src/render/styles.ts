/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createDistillery,
  type StyleHandle,
  type StylesCollector,
} from '@elastic/distillate';
import type { PrimitiveNode, StyledRenderContext } from '@elastic/isomer-sdk';
import type { HTMLStyleAdapter } from '@elastic/isomer-sdk/html';

// Guarded so the pack loads as unbundled browser ESM, where `process` is absent.
const dev =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

/**
 * The one distillery every charts style module is authored in. Its modules
 * interpolate `CHARTS_THEME` values, so it declares no theme variables, and
 * each module's name starts with `charts` so no class collides with another
 * library's on the page.
 */
export const chartsDistillery = createDistillery({
  dev,
  prefix: 'charts',
  themeScope: ':root',
  theme: {},
});

/** The pack's HTML style adapter: records the handles a render resolves and emits their rules. */
export const chartsStyleAdapter: HTMLStyleAdapter<
  PrimitiveNode,
  StylesCollector
> = {
  styleCollector: 'distillate',
  createCollector: () => chartsDistillery.artifactCollector('readable'),
  createRenderContext: (collector) => ({
    resolveClassName: (...handles) => {
      // Renderers pass Distillate handles, typed by the SDK as its narrower `StyleHandle`.
      collector.useHandles(handles as unknown as readonly StyleHandle[]);
      return handles.map(({ readableName }) => readableName).join(' ');
    },
  }),
  renderStyles: (collector) => chartsDistillery.renderStyles(collector),
};

/** Resolves handles through the render's adapter, or to their readable names when it has none. */
export const cls = (
  context: StyledRenderContext | undefined,
  ...handles: ReadonlyArray<StyleHandle | false | undefined>
): string => {
  const present = handles.filter((handle): handle is StyleHandle =>
    Boolean(handle)
  );
  return context?.resolveClassName
    ? context.resolveClassName(...present)
    : present.map(({ readableName }) => readableName).join(' ');
};
