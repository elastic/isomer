/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// `isomer-svg` with local interactions: tooltip, highlight, legend toggle and
// keyboard focus, and the `chart.select` and `chart.brush` events, raised with
// the Scene's own helpers so every renderer raises the same event. Drawn only
// when the host passes `onEvent`.

import {
  createElement,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
  useMemo,
  useRef,
  useState,
} from 'react';

import { brushEvent, selectEvent } from '../scene/events';
import type {
  Scene,
  SceneSelection,
  SceneTooltip,
  XyScene,
} from '../scene/types';
import type { ChartEvent } from '../schema/events';

import { draw } from './draw';
import { toReactDom } from './react_dom';
import { textWidth } from './scale';
import { SVG_THEME } from './theme';
import { el, type SvgElement, walkSvg } from './tree';
import { layoutXy } from './xy';

const { interaction: theme } = SVG_THEME;

interface Target {
  readonly hit: string;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Part {
  readonly selection?: SceneSelection | undefined;
  readonly tooltip: SceneTooltip;
  /** The xy series the part belongs to. */
  readonly series?: string;
}

const num = (value: string | number | undefined) => Number(value ?? 0);

/** Every element that takes a gesture for a part, in draw order, with its box. */
const targetsOf = (tree: SvgElement): Target[] =>
  walkSvg(tree).flatMap((element): Target[] => {
    const hit = element.attrs['data-hit'];
    if (hit === undefined) {
      return [];
    }
    const shape =
      element.tag === 'g'
        ? (element.children.find(
            (child): child is SvgElement =>
              typeof child !== 'string' && child.tag === 'rect'
          ) ?? element)
        : element;
    const { attrs } = shape;
    if (shape.tag === 'circle') {
      const r = num(attrs.r);
      return [
        {
          hit: String(hit),
          x: num(attrs.cx) - r,
          y: num(attrs.cy) - r,
          width: 2 * r,
          height: 2 * r,
        },
      ];
    }
    return [
      {
        hit: String(hit),
        x: num(attrs.x),
        y: num(attrs.y),
        width: num(attrs.width),
        height: num(attrs.height),
      },
    ];
  });

const partOf = (scene: Scene, hit: string): Part | undefined => {
  const [owner, index] = hit.split(':');
  if (scene.kind === 'metric') {
    const tile = scene.tiles[Number(index)];
    return tile && { selection: tile.selection, tooltip: tile.tooltip };
  }
  const series = scene.series[Number(owner)];
  const mark = series?.marks[Number(index)];
  return (
    mark && {
      selection: mark.selection,
      tooltip: mark.tooltip,
      series: series.key,
    }
  );
};

const tooltipBox = (
  scene: Scene,
  tooltip: SceneTooltip,
  target: Target,
  size: { width: number; height: number }
): SvgElement => {
  const { padding, gap, radius, swatch, size: fontSize } = theme.tooltip;
  const line = fontSize * SVG_THEME.font.lineHeight;
  const lines = [
    ...(tooltip.header ? [{ text: tooltip.header, bold: true }] : []),
    ...tooltip.entries.map((entry) => ({
      text: `${entry.label}: ${entry.value}`,
      bold: false,
      color: entry.color,
    })),
  ];
  const width =
    2 * padding +
    Math.max(
      0,
      ...lines.map(
        (entry) =>
          textWidth(entry.text, fontSize) +
          ('color' in entry && entry.color ? swatch + padding : 0)
      )
    );
  const height = 2 * padding + lines.length * line;
  const right = target.x + target.width + gap;
  const x =
    right + width <= size.width ? right : Math.max(0, target.x - gap - width);
  const y = Math.min(Math.max(0, target.y), Math.max(0, size.height - height));
  return el(
    'g',
    { 'data-part': 'tooltip', 'pointer-events': 'none' },
    el('rect', {
      x,
      y,
      width,
      height,
      rx: radius,
      fill: scene.chrome.background,
      stroke: scene.chrome.border,
    }),
    lines.map((entry, index) => {
      const baseline = y + padding + (index + 1) * line - line * 0.25;
      const color = 'color' in entry ? entry.color : undefined;
      return el(
        'g',
        {},
        color &&
          el('rect', {
            x: x + padding,
            y: baseline - swatch,
            width: swatch,
            height: swatch,
            fill: color,
          }),
        el(
          'text',
          {
            x: x + padding + (color ? swatch + padding : 0),
            y: baseline,
            'font-size': fontSize,
            'font-weight': entry.bold ? 'bold' : undefined,
            fill: scene.chrome.text,
          },
          entry.text
        )
      );
    })
  );
};

/** The Scene with its legend's hidden items replaced. */
const withHidden = (scene: Scene, hidden: ReadonlySet<string>): Scene =>
  scene.kind === 'xy'
    ? {
        ...scene,
        legend: {
          ...scene.legend,
          items: scene.legend.items.map((item) => ({
            ...item,
            hidden: hidden.has(item.key),
          })),
        },
      }
    : scene;

const nearestCategory = (scene: XyScene, value: number): number => {
  let best = value;
  let distance = Infinity;
  for (const { x } of scene.categories) {
    if (typeof x === 'number' && Math.abs(x - value) < distance) {
      best = x;
      distance = Math.abs(x - value);
    }
  }
  return best;
};

export interface InteractiveSceneSvgProps {
  readonly scene: Scene;
  readonly nodeId: string;
  readonly onEvent: (event: ChartEvent) => void;
}

/** A Scene drawn as SVG that answers the pointer and the keyboard. */
export const InteractiveSceneSvg = ({
  scene,
  nodeId,
  onEvent,
}: InteractiveSceneSvgProps): ReactNode => {
  const [hidden, setHidden] = useState<ReadonlySet<string>>(
    () =>
      new Set(
        scene.kind === 'xy'
          ? scene.legend.items.filter((i) => i.hidden).map((i) => i.key)
          : []
      )
  );
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<number | null>(null);
  const [drag, setDrag] = useState<{ from: number; to: number } | null>(null);
  const brushed = useRef(false);
  const svg = useRef<SVGSVGElement | null>(null);

  const shown = useMemo(() => withHidden(scene, hidden), [scene, hidden]);
  const { tree, size } = useMemo(
    () => draw(shown, { interactive: true }),
    [shown]
  );
  const targets = useMemo(() => targetsOf(tree), [tree]);
  const layout = useMemo(
    () => (shown.kind === 'xy' ? layoutXy(shown) : undefined),
    [shown]
  );

  const raise = (selection: SceneSelection | undefined, negate: boolean) => {
    if (selection) {
      onEvent(selectEvent(nodeId, selection, negate));
    }
  };
  const toggle = (key: string) =>
    setHidden((current) => {
      const next = new Set(current);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  const legendItem = (key: string) =>
    shown.kind === 'xy'
      ? shown.legend.items.find((item) => item.key === key)
      : undefined;

  const active =
    focus !== null ? targets[focus] : targets.find((t) => t.hit === hover);
  const activePart = active && partOf(shown, active.hit);
  const highlighted = activePart?.series;

  /** A pointer position in drawing units, along the x axis. */
  const along = (event: MouseEvent) => {
    const box = svg.current?.getBoundingClientRect();
    const scaleX = box && box.width > 0 ? size.width / box.width : 1;
    const scaleY = box && box.height > 0 ? size.height / box.height : 1;
    const x = (event.clientX - (box?.left ?? 0)) * scaleX;
    const y = (event.clientY - (box?.top ?? 0)) * scaleY;
    return layout?.xHorizontal ? x : y;
  };
  const canBrush =
    shown.kind === 'xy' &&
    shown.interactions.brush !== undefined &&
    layout?.scales.x.invert(0) !== undefined;

  const decorate = (element: SvgElement) => {
    const { attrs } = element;
    if (element.tag === 'svg') {
      const focused = active && focus !== null ? activePart : undefined;
      return {
        ref: svg,
        tabIndex: 0,
        role: 'group',
        'aria-roledescription': 'chart',
        'aria-label': focused?.selection
          ? `${shown.summary} ${focused.selection.description}`
          : shown.summary,
        onKeyDown: (event: KeyboardEvent) => {
          const last = targets.length - 1;
          const move = (to: number) => {
            event.preventDefault();
            setFocus(Math.min(Math.max(to, 0), last));
          };
          switch (event.key) {
            case 'ArrowRight':
            case 'ArrowDown':
              return move(focus === null ? 0 : focus + 1);
            case 'ArrowLeft':
            case 'ArrowUp':
              return move(focus === null ? last : focus - 1);
            case 'Home':
              return move(0);
            case 'End':
              return move(last);
            case 'Enter':
            case ' ':
              if (focus !== null) {
                event.preventDefault();
                raise(activePart?.selection, event.altKey);
              }
              return undefined;
            case 'Escape':
              return setFocus(null);
            default:
              return undefined;
          }
        },
        onBlur: () => setFocus(null),
        ...(canBrush && {
          onPointerDown: (event: MouseEvent) => {
            const at = along(event);
            setDrag({ from: at, to: at });
          },
          onPointerMove: (event: MouseEvent) => {
            if (drag) {
              setDrag({ ...drag, to: along(event) });
            }
          },
          onPointerUp: (event: MouseEvent) => {
            if (!drag || shown.kind !== 'xy' || !layout) {
              return;
            }
            const to = along(event);
            setDrag(null);
            if (Math.abs(to - drag.from) < theme.brushThreshold) {
              return;
            }
            brushed.current = true;
            const ends = [drag.from, to].map((pixel) =>
              nearestCategory(shown, layout.scales.x.invert(pixel) as number)
            ) as [number, number];
            const event_ = brushEvent(shown, nodeId, ends);
            if (event_) {
              onEvent(event_);
            }
          },
        }),
        onClickCapture: (event: MouseEvent) => {
          if (brushed.current) {
            brushed.current = false;
            event.stopPropagation();
          }
        },
      };
    }
    const hit = attrs['data-hit'];
    if (hit !== undefined) {
      const part = partOf(shown, String(hit));
      return {
        onPointerEnter: () => setHover(String(hit)),
        onPointerLeave: () => setHover(null),
        onClick: (event: MouseEvent) => raise(part?.selection, event.altKey),
        style: part?.selection ? { cursor: 'pointer' } : undefined,
      };
    }
    const legendSelect = attrs['data-legend-select'];
    if (legendSelect !== undefined) {
      const item = legendItem(String(legendSelect));
      return {
        onClick: (event: MouseEvent) =>
          item?.selection
            ? raise(item.selection, event.altKey)
            : toggle(String(legendSelect)),
        style: { cursor: 'pointer' },
      };
    }
    const legendToggle = attrs['data-legend-toggle'];
    if (legendToggle !== undefined) {
      return {
        onClick: () => toggle(String(legendToggle)),
        style: { cursor: 'pointer' },
      };
    }
    const category = attrs['data-category'];
    if (category !== undefined && shown.kind === 'xy') {
      const selection = shown.categories[Number(category)]?.selection;
      return selection
        ? {
            onClick: (event: MouseEvent) => raise(selection, event.altKey),
            style: { cursor: 'pointer' },
          }
        : undefined;
    }
    const seriesPath = attrs['data-series-path'];
    if (seriesPath !== undefined && shown.kind === 'xy') {
      const selection = shown.series[Number(seriesPath)]?.selection;
      return selection
        ? {
            onClick: (event: MouseEvent) => raise(selection, event.altKey),
            style: { cursor: 'pointer' },
          }
        : undefined;
    }
    const series = attrs['data-series'];
    if (series !== undefined && highlighted !== undefined) {
      return series === highlighted ? undefined : { opacity: theme.dimOpacity };
    }
    return undefined;
  };

  const overlay: SvgElement[] = [];
  if (drag && layout) {
    const { plot, xHorizontal } = layout;
    const [a, b] = [Math.min(drag.from, drag.to), Math.max(drag.from, drag.to)];
    overlay.push(
      el('rect', {
        'data-part': 'brush',
        'pointer-events': 'none',
        fill: shown.chrome.text,
        'fill-opacity': theme.brushOpacity,
        ...(xHorizontal
          ? { x: a, y: plot.top, width: b - a, height: plot.bottom - plot.top }
          : {
              x: plot.left,
              y: a,
              width: plot.right - plot.left,
              height: b - a,
            }),
      })
    );
  }
  if (active && focus !== null) {
    const pad = theme.focusPadding;
    overlay.push(
      el('rect', {
        'data-part': 'focus',
        'pointer-events': 'none',
        x: active.x - pad,
        y: active.y - pad,
        width: active.width + 2 * pad,
        height: active.height + 2 * pad,
        fill: 'none',
        stroke: shown.chrome.text,
        'stroke-width': theme.focusStrokeWidth,
      })
    );
  }
  if (active && activePart && activePart.tooltip.entries.length > 0) {
    overlay.push(tooltipBox(shown, activePart.tooltip, active, size));
  }

  return toReactDom(tree, {
    decorate,
    overlay: overlay.map((element, index) =>
      createElement('g', { key: index }, toReactDom(element))
    ),
  });
};
