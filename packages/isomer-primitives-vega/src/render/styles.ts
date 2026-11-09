/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties } from 'react';
import {
  createDistillery,
  type LocalVarGroup,
  type StyleHandle,
  type StylesCollector,
} from '@elastic/distillate';
import type { PrimitiveNode, StyledRenderContext } from '@elastic/isomer-sdk';
import type { HTMLStyleAdapter } from '@elastic/isomer-sdk/html';

import { VEGA_LAYOUT } from './layout';

// Guarded so the pack loads as unbundled browser ESM, where `process` is absent.
const dev =
  typeof process !== 'undefined' && process.env.NODE_ENV !== 'production';

/** The distillery every rule the pack draws with is authored in; each class starts with `vega`. */
export const vegaDistillery = createDistillery({
  dev,
  prefix: 'vega',
  themeScope: ':root',
  theme: {},
});

const { linkHeight, note, type } = VEGA_LAYOUT;

type ChromeVar = 'ink' | 'fill' | 'height';

let chromeVars: LocalVarGroup<ChromeVar> | undefined;

/** The chart's box, its link line and its fallback note. */
export const vegaModule = vegaDistillery.createStyleModule(
  'vegaChart',
  ({ css, vars }) => {
    const chrome = vars('chrome', {
      ink: 'currentColor',
      fill: 'transparent',
      height: 'auto',
    });
    chromeVars = chrome;
    return {
      chart: css`
        display: block;
        line-height: 0;
      `,
      link: css`
        ${chrome}
        color: ${chrome.ink};
        background: ${chrome.fill};
        display: block;
        height: ${linkHeight}px;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-size: ${type.body}px;
        line-height: ${linkHeight}px;
      `,
      note: css`
        ${chrome}
        color: ${chrome.ink};
        display: flex;
        flex-direction: column;
        gap: ${note.padding / 2}px;
        box-sizing: border-box;
        height: ${chrome.height};
        overflow: hidden;
        padding: ${note.padding}px;
        border: ${note.borderWidth}px dashed currentColor;
      `,
      noteTitle: css`
        font-size: ${type.title}px;
      `,
      noteBody: css`
        font-size: ${type.body}px;
      `,
    };
  }
);

/** The module-local vars a renderer sets on the link and the note. */
export const vegaChromeVars = chromeVars as LocalVarGroup<ChromeVar>;

/** The pack's HTML style adapter: records the handles a render resolves and emits their rules. */
export const vegaStyleAdapter: HTMLStyleAdapter<
  PrimitiveNode,
  StylesCollector
> = {
  styleCollector: 'distillate',
  createCollector: () => vegaDistillery.artifactCollector('readable'),
  createRenderContext: (collector) => ({
    resolveClassName: (...handles) => {
      // Renderers pass Distillate handles, typed by the SDK as its narrower `StyleHandle`.
      collector.useHandles(handles as unknown as readonly StyleHandle[]);
      return handles.map(({ readableName }) => readableName).join(' ');
    },
  }),
  renderStyles: (collector) => vegaDistillery.renderStyles(collector),
};

/** Sets the chrome vars on one element; its `style` holds only custom properties the module declares. */
export const chromeStyle = (
  values: Partial<Record<ChromeVar, string>>
): CSSProperties =>
  Object.fromEntries(
    Object.entries(values).flatMap(([key, value]) =>
      value === undefined
        ? []
        : [[vegaChromeVars[key as ChromeVar].propName, value]]
    )
  );

/** Resolves handles through the render's adapter, or to their readable names when it has none. */
export const cls = (
  context: Pick<StyledRenderContext, 'resolveClassName'> | undefined,
  ...handles: StyleHandle[]
): string =>
  context?.resolveClassName
    ? context.resolveClassName(...handles)
    : handles.map(({ readableName }) => readableName).join(' ');

/** Every rule the pack draws with, for a host that draws the `react` surface and ships the CSS itself. */
export const vegaStylesheet = (): string =>
  vegaDistillery.renderStyles(vegaDistillery.stylesheetCollector());
