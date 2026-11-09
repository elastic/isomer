/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The few elements this engine draws beside Elastic Charts' own, authored in
// the charts pack's distillery so the pack's style adapter emits their rules.
// A host that ships the CSS itself ships `elasticChartsStylesheet()`, which
// holds them whatever has loaded.

import {
  createVarsModule,
  type LocalVarGroup,
  type StyleHandle,
} from '@elastic/isomer-primitives-charts/scene';

import { EMPTY_TEXT_SIZE } from './empty';

/** Kibana's legend action gap, in pixels. */
const LEGEND_ACTION_GAP = 2;

/** Above Elastic Charts' own layers, as EUI's tooltip draws. */
const TOOLTIP_Z_INDEX = 10000;

interface ElasticStyles {
  readonly handles: Readonly<
    Record<
      | 'secondary'
      | 'tooltip'
      | 'legendAction'
      | 'drawing'
      | 'fluidDrawing'
      | 'empty',
      StyleHandle
    >
  >;
  readonly vars: {
    readonly ink: LocalVarGroup<'color'>;
    readonly anchor: LocalVarGroup<'top' | 'left'>;
    readonly box: LocalVarGroup<
      'width' | 'height' | 'maxWidth' | 'aspectRatio'
    >;
    readonly empty: LocalVarGroup<'width' | 'height' | 'ink' | 'fill'>;
  };
  readonly stylesheet: () => string;
}

export const elasticModule: ElasticStyles = createVarsModule(
  'chartsElastic',
  (vars) => ({
    ink: vars('ink', { color: 'currentColor' }),
    anchor: vars('anchor', { top: '0px', left: '0px' }),
    box: vars('box', {
      width: 'auto',
      height: 'auto',
      maxWidth: 'none',
      aspectRatio: 'auto',
    }),
    empty: vars('empty', {
      width: '100%',
      height: '100%',
      ink: 'currentColor',
      fill: 'transparent',
    }),
  }),
  ({ css }, { ink, anchor, box, empty }) => ({
    /** A metric's secondary text without a badge, in the Scene's color. */
    secondary: css`
      ${ink}
      color: ${ink.color};
    `,
    /** A secondary label's tooltip, above its trigger, outside the tile's clip. */
    tooltip: css`
      ${anchor}
      position: fixed;
      top: ${anchor.top};
      left: ${anchor.left};
      transform: translate(-50%, -100%);
      z-index: ${TOOLTIP_Z_INDEX};
      pointer-events: none;
    `,
    legendAction: css`
      display: inline-flex;
      gap: ${LEGEND_ACTION_GAP}px;
    `,
    /** A headless drawing at the size it was drawn at. */
    drawing: css`
      ${box}
      display: flex;
      width: ${box.width};
      height: ${box.height};
    `,
    /** A headless drawing scaled to its container at its own aspect ratio. */
    fluidDrawing: css`
      ${box}
      display: flex;
      width: 100%;
      max-width: ${box.maxWidth};
      aspect-ratio: ${box.aspectRatio};
    `,
    /** A Scene with nothing to draw: its note, centered on the chart's background. */
    empty: css`
      ${empty}
      display: flex;
      align-items: center;
      justify-content: center;
      width: ${empty.width};
      height: ${empty.height};
      color: ${empty.ink};
      background: ${empty.fill};
      font-size: ${EMPTY_TEXT_SIZE}px;
    `,
  })
);

/**
 * Every rule this engine draws its own elements with, for a host that draws
 * the `react` surface and ships the CSS itself, beside the pack's
 * `chartsStylesheet()`. It holds them whether or not the engine had loaded
 * when the host built its stylesheet.
 */
export const elasticChartsStylesheet = (): string => elasticModule.stylesheet();
