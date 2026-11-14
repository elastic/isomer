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

import { EMPTY_LINE_HEIGHT, EMPTY_TEXT_SIZE } from './empty';
import { TAG_CLOUD_LABEL } from './tag_cloud_label';

/** Kibana's legend action gap, in pixels. */
const LEGEND_ACTION_GAP = 2;

/** Above Elastic Charts' own layers, as EUI's tooltip draws. */
const TOOLTIP_Z_INDEX = 10000;

const BOX_DEFAULTS = {
  width: '100%',
  height: '100%',
  ink: 'currentColor',
  fill: 'transparent',
};

interface ElasticStyles {
  readonly handles: Readonly<
    Record<
      | 'secondary'
      | 'tooltip'
      | 'legendAction'
      | 'empty'
      | 'tagCloud'
      | 'tagCloudCloud'
      | 'tagCloudLabel',
      StyleHandle
    >
  >;
  readonly vars: {
    readonly ink: LocalVarGroup<'color'>;
    readonly anchor: LocalVarGroup<'top' | 'left'>;
    readonly empty: LocalVarGroup<keyof typeof BOX_DEFAULTS>;
    readonly tagCloud: LocalVarGroup<keyof typeof BOX_DEFAULTS>;
  };
  readonly stylesheet: () => string;
}

export const elasticModule: ElasticStyles = createVarsModule(
  'chartsElastic',
  (vars) => ({
    ink: vars('ink', { color: 'currentColor' }),
    anchor: vars('anchor', { top: '0px', left: '0px' }),
    empty: vars('empty', BOX_DEFAULTS),
    tagCloud: vars('tagCloud', BOX_DEFAULTS),
  }),
  ({ css }, { ink, anchor, empty, tagCloud }) => ({
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
      line-height: ${EMPTY_LINE_HEIGHT}px;
      text-align: center;
    `,
    /** A tag cloud: the cloud above its label, at the Scene's size, on its background, which Elastic Charts' word cloud does not paint. */
    tagCloud: css`
      ${tagCloud}
      display: flex;
      flex-direction: column;
      width: ${tagCloud.width};
      height: ${tagCloud.height};
      background: ${tagCloud.fill};
    `,
    /** The cloud, in the height the label leaves it. */
    tagCloudCloud: css`
      flex: 1 1 0;
      min-height: 0;
    `,
    /** The label under a tag cloud, centered in the Scene's text color, as Kibana draws it. */
    tagCloudLabel: css`
      color: ${tagCloud.ink};
      font-size: ${TAG_CLOUD_LABEL.size}px;
      line-height: ${TAG_CLOUD_LABEL.lineHeight}px;
      font-weight: ${TAG_CLOUD_LABEL.weight};
      text-align: center;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
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
