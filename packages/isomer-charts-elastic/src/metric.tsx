/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A metric Scene as Kibana's metric visualization draws it
// (`expression_metric/public/components/metric_vis.tsx`): one Elastic Charts
// `Metric` with a tile per Scene tile, every string and color from the Scene.

import { type ReactNode, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Metric,
  type MetricDatum,
  type PartialTheme,
  type SecondaryMetricProps,
  Settings,
  TooltipContainer,
  TooltipHeader,
} from '@elastic/charts';
import {
  cls,
  type MetricScene,
  type MetricTile,
  px,
  type SceneRenderEnv,
  varStyle,
} from '@elastic/isomer-primitives-charts/scene';

import { ariaDescriptionOf } from './accessibility';
import { metricHandlers } from './events';
import type { ElasticChartsOptions } from './options';
import { elasticModule } from './styles';
import { chromeTheme, kibanaBaseTheme } from './theme';

type PlainSecondaryProps = NonNullable<MetricTile['secondary']>;

/** Resolves this engine's style handles: the render's adapter, else their readable names. */
type Styles = Pick<SceneRenderEnv, 'resolveClassName'> | undefined;

const { handles: elastic, vars } = elasticModule;

/** The secondary text's class names: Elastic Charts' own, then the Scene's color. */
const secondaryClass = (styles: Styles) =>
  `echSecondaryMetric ${cls(styles, elastic.secondary)}`;

/**
 * A tooltip label as Elastic Charts' secondary metric offers it: a focusable
 * trigger whose label shows on hover or focus, and is read from the text.
 */
const TooltipLabelled = ({
  label,
  color,
  styles,
  children,
}: {
  label: string;
  color: string;
  styles: Styles;
  children: ReactNode;
}) => {
  // The tile clips its overflow, so the tooltip draws in a portal placed
  // above the trigger: in the trigger's shadow root, whose stylesheets it
  // needs, else on its own document's body.
  const [open, setOpen] = useState<
    { rect: DOMRect; container: Element | ShadowRoot } | undefined
  >();
  const show = ({ currentTarget }: { currentTarget: Element }) => {
    const root = currentTarget.getRootNode();
    // A shadow root is the one root that is a document fragment; checked by
    // node type, since `instanceof` fails across frames.
    const shadow =
      root.nodeType === root.DOCUMENT_FRAGMENT_NODE
        ? (root as ShadowRoot)
        : undefined;
    setOpen({
      rect: currentTarget.getBoundingClientRect(),
      container: shadow ?? currentTarget.ownerDocument.body,
    });
  };
  const hide = () => setOpen(undefined);
  const trigger = useRef<HTMLSpanElement>(null);
  const isOpen = open !== undefined;
  // Follows the trigger while open: scroll does not bubble, so it is captured
  // on the trigger's root and, for a shadow root, its document as well.
  useEffect(() => {
    const target = trigger.current;
    if (!isOpen || !target) {
      return;
    }
    const follow = () =>
      setOpen(
        (current) =>
          current && { ...current, rect: target.getBoundingClientRect() }
      );
    const owner = target.ownerDocument;
    const roots = new Set<Node>([target.getRootNode(), owner]);
    roots.forEach((root) => root.addEventListener('scroll', follow, true));
    owner.defaultView?.addEventListener('resize', follow);
    return () => {
      roots.forEach((root) => root.removeEventListener('scroll', follow, true));
      owner.defaultView?.removeEventListener('resize', follow);
    };
  }, [isOpen]);
  return (
    <span
      ref={trigger}
      className={secondaryClass(styles)}
      role="button"
      tabIndex={0}
      style={varStyle(vars.ink, { color })}
      onPointerEnter={show}
      onPointerLeave={hide}
      onFocus={show}
      onBlur={hide}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          hide();
        }
      }}>
      <span className="echScreenReaderOnly">{label} </span>
      {children}
      {open
        ? createPortal(
            <div
              aria-hidden="true"
              className={`echSecondaryMetric__tooltip ${cls(styles, elastic.tooltip)}`}
              style={varStyle(vars.anchor, {
                top: px(open.rect.top),
                left: px(open.rect.left + open.rect.width / 2),
              })}>
              <TooltipContainer>
                <TooltipHeader>{label}</TooltipHeader>
              </TooltipContainer>
            </div>,
            open.container
          )
        : null}
    </span>
  );
};

/**
 * Without a badge, Elastic Charts recolors secondary-metric props to its
 * contrast color, so the text is drawn as an element in the Scene's color.
 */
const plainSecondary = (
  { text, color, label, labelPlacement }: PlainSecondaryProps,
  styles: Styles
) => {
  const PlainSecondary = () =>
    label !== undefined && labelPlacement === 'tooltip' ? (
      <TooltipLabelled label={label} color={color} styles={styles}>
        {text}
      </TooltipLabelled>
    ) : (
      <span
        className={secondaryClass(styles)}
        style={varStyle(vars.ink, { color })}>
        {label !== undefined && labelPlacement === 'before' ? (
          <span className="echSecondaryMetric__label">{label} </span>
        ) : null}
        {text}
        {label !== undefined && labelPlacement === 'after' ? (
          <span className="echSecondaryMetric__label"> {label}</span>
        ) : null}
      </span>
    );
  return PlainSecondary;
};

const secondaryOf = (
  { secondary }: MetricTile,
  styles: Styles
): MetricDatum['extra'] | undefined => {
  if (secondary === undefined) {
    return undefined;
  }
  const { badge } = secondary;
  if (badge === undefined) {
    return plainSecondary(secondary, styles);
  }
  const props: SecondaryMetricProps = {
    value: secondary.text,
    ...(badge.icon === undefined ? {} : { icon: badge.icon }),
    ...(secondary.label === undefined ? {} : { label: secondary.label }),
    labelPosition: secondary.labelPlacement,
    badgeColor: badge.color,
    badgeTextColor: secondary.color,
    badgeBorderColor: { mode: 'none' },
  };
  return props;
};

/** The Elastic Charts datum for a tile. Its value prints the Scene's text, whatever Elastic Charts passes. */
export const metricDatum = (tile: MetricTile, styles?: Styles): MetricDatum => {
  const { progress, trend, value } = tile;
  const text = () => value.text;
  const extra = secondaryOf(tile, styles);
  const base = {
    title: tile.title,
    ...(tile.subtitle === undefined ? {} : { subtitle: tile.subtitle }),
    ...(extra === undefined ? {} : { extra }),
    color: progress?.color ?? trend?.color ?? tile.background,
    ...(progress || trend ? { background: tile.background } : {}),
    valueColor: value.color,
  };
  const numeric = typeof value.raw === 'number' ? value.raw : undefined;
  if (progress) {
    return {
      ...base,
      value: progress.fraction,
      domainMax: 1,
      progressBarDirection: progress.orientation,
      valueFormatter: text,
    };
  }
  const datum: MetricDatum =
    numeric === undefined
      ? { ...base, value: value.text }
      : { ...base, value: numeric, valueFormatter: text };
  if (trend) {
    const points = trend.points.flatMap(({ x, y }) =>
      y === null ? [] : [{ x, y }]
    );
    return { ...datum, trend: points, trendShape: 'area' };
  }
  return datum;
};

/** Tiles in rows of `layout.columns`, as Kibana slices them. */
export const metricGrid = (
  scene: MetricScene,
  styles?: Styles
): (MetricDatum | undefined)[][] => {
  const { columns } = scene.layout;
  const grid: (MetricDatum | undefined)[][] = [];
  for (let at = 0; at < scene.tiles.length; at += columns) {
    grid.push(
      scene.tiles
        .slice(at, at + columns)
        .map((tile) => metricDatum(tile, styles))
    );
  }
  return grid;
};

/** The metric overrides Kibana sets on `Settings`, from the Scene's layout and chrome. */
export const metricTheme = (scene: MetricScene): PartialTheme => {
  const { layout, chrome } = scene;
  const track = scene.tiles.find(({ progress }) => progress)?.progress?.track;
  return {
    ...chromeTheme(chrome),
    metric: {
      ...(track === undefined ? {} : { barBackground: track }),
      emptyBackground: chrome.background,
      blendingBackground: chrome.background,
      titlesTextAlign: layout.labelsAlignment,
      valueTextAlign: layout.valueAlignment,
      extraTextAlign: layout.secondaryAlignment,
      iconAlign: layout.icon?.alignment ?? 'right',
      valueFontSize: layout.valueSizing === 'fill' ? 'fit' : 'default',
      spacing: layout.density === 'compact' ? 'small' : 'large',
      valuePosition: layout.valuePosition,
    },
  };
};

/** A metric Scene's spec elements, for `<Chart>` or headless drawing. */
export const metricSpecs = (
  scene: MetricScene,
  env: SceneRenderEnv,
  options: ElasticChartsOptions
): ReactNode => (
  <>
    <Settings
      baseTheme={kibanaBaseTheme(scene.scheme)}
      theme={metricTheme(scene)}
      locale={scene.locale}
      debugState={options.debugState ?? false}
      {...(scene.title === undefined ? {} : { ariaLabel: scene.title })}
      ariaDescription={ariaDescriptionOf(scene)}
      {...metricHandlers(scene, env)}
    />
    <Metric id="metric" data={metricGrid(scene, env)} />
  </>
);
