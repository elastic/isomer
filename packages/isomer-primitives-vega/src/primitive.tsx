/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ChartEvent,
  toActionEvent,
} from '@elastic/isomer-primitives-charts/schema';
import {
  type DefaultPackTypes,
  definePrimitiveFor,
  nodeAnchor,
  sanitizeNavigationHref,
  type StyledRenderContext,
  z,
} from '@elastic/isomer-sdk';

import { VEGA_LAYOUT } from './render/layout';
import { LiveChart } from './render/live_chart';
import {
  createVegaView,
  renderVegaSvg,
  toVegaSpec,
  type VegaChartInput,
} from './render/render';
import { chromeStyle, cls, vegaModule } from './render/styles';
import { VEGA_THEMES, type VegaScheme } from './render/theme';
import { vegaCatalog } from './schema/catalog';
import { vegaExamples } from './schema/examples';
import {
  MAX_CHART_SIDE,
  TILE_SRC,
  type VegaNode,
  vegaSchema,
} from './schema/node';
import { isSpecObject, stripSpec } from './schema/spec';
import { summaryOf, vegaMarkdown, vegaText } from './text';

export const VEGA_INTERACTIVE = 'vegaInteractive';

/** The render context the `vega` primitive reads. Every field is optional. */
export interface VegaRenderContext extends StyledRenderContext {
  /** Absent: the frame theme's `scheme` on `snapshot`, else `light`. */
  readonly scheme?: VegaScheme;
  /** The box a container gives the chart, its link line included. Absent: the node's size, else 480 × 270. */
  readonly size?: { readonly width: number; readonly height: number };
}

interface VegaPackTypes extends DefaultPackTypes {
  context: VegaRenderContext;
}

const definePrimitive = definePrimitiveFor<VegaPackTypes>();

const { defaultSize, linkHeight } = VEGA_LAYOUT;

const schemeOfTheme = (theme: unknown): VegaScheme | undefined => {
  if (typeof theme !== 'object' || theme === null || !('scheme' in theme)) {
    return undefined;
  }
  const { scheme } = theme;
  return scheme === 'light' || scheme === 'dark' ? scheme : undefined;
};

/** The node's link, when its `href` passes the SDK's navigation policy. */
const linkOf = (node: VegaNode) => {
  const link = node.interactions?.link;
  const href = link && sanitizeNavigationHref(link.href);
  return link && href ? { href, label: link.label } : undefined;
};

const clampSide = (value: number) =>
  Math.max(16, Math.min(MAX_CHART_SIDE, Math.round(value)));

/** The box the chart draws in: the host's, less the link line; else the node's; else the default. */
export const vegaChartSize = (
  node: VegaNode,
  size: VegaRenderContext['size']
): { width: number; height: number } => {
  if (size) {
    return {
      width: clampSide(size.width),
      height: clampSide(size.height - (linkOf(node) ? linkHeight : 0)),
    };
  }
  return {
    width: node.width ?? defaultSize.width,
    height: node.height ?? defaultSize.height,
  };
};

const chartInput = (
  node: VegaNode,
  size: { width: number; height: number }
): VegaChartInput => ({
  mode: node.mode,
  spec: node.spec,
  ...size,
  ...(node.results && { results: node.results }),
  ...(node.data && { data: node.data }),
});

/** Where the spec does not compile or parse, the message why; checked at validation so an author sees it. */
const parseProblem = (node: VegaNode): string | undefined => {
  try {
    createVegaView(
      toVegaSpec(
        chartInput(node, vegaChartSize(node, undefined)),
        VEGA_THEMES.light
      )
    ).finalize();
    return undefined;
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
};

/** {@link vegaSchema} with the check that Vega compiles and parses the spec. */
export const vegaPrimitiveSchema = vegaSchema.check(
  z.superRefine<VegaNode>((node, ctx) => {
    if (!isSpecObject(node.spec)) {
      return;
    }
    const problem = parseProblem(node);
    if (problem !== undefined) {
      ctx.addIssue({ code: 'custom', path: ['spec'], message: problem });
    }
  })
);

const round = (value: number) => Math.round(value * 100) / 100;

/** `svg` with `basemap`'s tiles as its first children, under everything Vega drew. */
const withBasemap = (svg: string, basemap: VegaNode['basemap']): string => {
  if (!basemap?.tiles.length) {
    return svg;
  }
  const tiles = basemap.tiles
    .filter(({ src }) => TILE_SRC.test(src))
    .map(
      ({ src, x, y, width, height }) =>
        `<image href="${src}" x="${round(x)}" y="${round(y)}" width="${round(
          width
        )}" height="${round(height)}" preserveAspectRatio="none"/>`
    )
    .join('');
  return svg.replace(
    /^(<svg[^>]*>)/,
    `$1<g data-isomer-vega-basemap="">${tiles}</g>`
  );
};

/** JSON safe inside a `<script>`: no `<` can close it and no line separator can break it. */
const scriptJson = (value: unknown) =>
  JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');

/** A chart with host results or a basemap draws statically: a live view would lose either. */
const canGoLive = (node: VegaNode) => !node.basemap && !node.results?.length;

/** The fields a live view needs to raise events. */
const liveNode = ({ id, data, interactions }: VegaNode) => ({
  ...(id !== undefined && { id }),
  ...(data && { data }),
  ...(interactions && { interactions }),
});

const icon = {
  svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><rect x="2" y="9" width="3" height="5" rx=".5" fill="var(--isomer-icon-muted, #98a2b3)"/><rect x="6.5" y="6" width="3" height="8" rx=".5" fill="var(--isomer-icon-muted, #98a2b3)"/><rect x="11" y="3" width="3" height="11" rx=".5" fill="var(--isomer-icon-muted, #98a2b3)"/><polyline points="2,8 7,4.5 13,1.5" fill="none" stroke="var(--isomer-icon-accent, #3d5ad8)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>',
};

/** The `vega` primitive: a Vega or Vega-Lite spec drawn by the Vega runtime. */
export const vegaPrimitive = definePrimitive({
  type: 'vega',
  icon,
  schema: vegaPrimitiveSchema,
  catalog: vegaCatalog,
  examples: vegaExamples,
  // An unsafe link is dropped, and the spec loses everything that reaches outside it.
  sanitize: (node: VegaNode) => {
    if (!isSpecObject(node.spec)) {
      return null;
    }
    const { interactions } = node;
    const href =
      interactions?.link && sanitizeNavigationHref(interactions.link.href);
    const safeInteractions =
      interactions?.link && href === null
        ? (({ link: _link, ...rest }) => rest)(interactions)
        : interactions;
    return {
      ...node,
      spec: stripSpec(node.spec),
      ...(safeInteractions && { interactions: safeInteractions }),
    };
  },
  metrics: {
    snapshotHeight: (node: VegaNode) =>
      vegaChartSize(node, undefined).height + (linkOf(node) ? linkHeight : 0),
  },
  renderers: {
    react: (node: VegaNode, { context, theme: frameTheme }) => {
      const scheme = context?.scheme ?? schemeOfTheme(frameTheme) ?? 'light';
      const theme = VEGA_THEMES[scheme];
      const size = vegaChartSize(node, context?.size);
      const link = linkOf(node);
      const anchor = nodeAnchor(context, node);
      const chrome = chromeStyle({ ink: theme.text, fill: theme.background });
      const label = summaryOf(node);
      let vegaSpec;
      let svg;
      try {
        vegaSpec = toVegaSpec(chartInput(node, size), theme);
        svg = withBasemap(renderVegaSvg(vegaSpec, size).svg, node.basemap);
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        return (
          <div
            {...anchor}
            role="note"
            data-isomer-vega=""
            data-isomer-vega-error={reason}
            className={cls(context, vegaModule.handles.note)}
            style={chromeStyle({
              ink: theme.text,
              height: `${size.height}px`,
            })}>
            <strong className={cls(context, vegaModule.handles.noteTitle)}>
              {node.title ?? 'Vega chart'}
            </strong>
            <span className={cls(context, vegaModule.handles.noteBody)}>
              {node.description}
            </span>
          </div>
        );
      }
      const onEvent =
        context?.onEvent &&
        ((event: ChartEvent) => context.onEvent?.(toActionEvent(event)));
      const embed =
        frameTheme === undefined &&
        canGoLive(node) &&
        context?.enhancements?.has(VEGA_INTERACTIVE);
      const chartClass = cls(context, vegaModule.handles.chart);
      return (
        <div data-isomer-vega="" {...anchor}>
          {frameTheme === undefined && canGoLive(node) ? (
            <LiveChart
              svg={svg}
              spec={vegaSpec}
              node={liveNode(node)}
              onEvent={onEvent}
              className={chartClass}
              label={label}
            />
          ) : (
            <div
              className={chartClass}
              data-isomer-vega-chart=""
              role="img"
              aria-label={label}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
          {embed && (
            <script
              type="application/json"
              data-isomer-vega-spec=""
              dangerouslySetInnerHTML={{
                __html: scriptJson({ spec: vegaSpec, node: liveNode(node) }),
              }}
            />
          )}
          {link && (
            <a
              href={link.href}
              title={link.label}
              className={cls(context, vegaModule.handles.link)}
              style={chrome}>
              {link.label}
            </a>
          )}
        </div>
      );
    },
    text: vegaText,
    markdown: vegaMarkdown,
  },
});
