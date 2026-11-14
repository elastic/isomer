/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

// Draws each example Scene with Elastic Charts and reads back what it drew,
// through the `DebugState` Kibana's functional tests read (and the page, for
// the metric chart, which reports none). Every string and color must be the
// Scene's: that is Gate B's content criterion for this renderer.

import * as React from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act as testUtilsAct } from 'react-dom/test-utils';
import {
  type CustomTooltip,
  type DebugState,
  Tooltip,
  Wordcloud,
} from '@elastic/charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  type ChartEvent,
  formatAxisValue,
  type MetricScene,
  metricSingleValueScene,
  type PartitionNode,
  type PartitionScene,
  type Scene,
  type SceneAxis,
  type SceneRenderEnv,
  selectEvent,
  xyInteractiveScene,
  type XyScene,
  type XySceneLayer,
  xyTimeSeriesScene,
} from '@elastic/isomer-primitives-charts/scene';
import {
  chartEventExamples,
  gaugeExamples,
  heatmapExamples,
  type HeatmapNode,
  metricExamples,
  partitionChartExamples,
  tagCloudExamples,
  xyChartExamples,
} from '@elastic/isomer-primitives-charts/schema';
import { afterEach, describe, expect, it } from 'vitest';

import { seriesOf } from './events';
import {
  gaugeColorBands,
  gaugeTargetFormatter,
  gaugeValueFormatter,
} from './gauge';
import { heatmapTooltip, heatmapValueFormatter } from './heatmap';
import { partitionValueFormatter, slicesOf } from './partition';
import { createElasticChartsRenderer } from './renderer';
import { sceneSpecs } from './specs';
import { elasticModule } from './styles';
import { tagCloudData } from './tag_cloud';
import { sceneTooltip } from './xy';

const { handles: elastic, vars } = elasticModule;

// React 18.3 exports `act` from `react`; earlier 18.x only from `react-dom/test-utils`.
const { act = testUtilsAct } = React as { act?: typeof testUtilsAct };

// jsdom has no layout and no canvas: Elastic Charts learns its size from
// ResizeObserver and measures text through a 2D context.
class FixedResizeObserver {
  constructor(private readonly callback: ResizeObserverCallback) {}
  observe(target: Element) {
    const chart = target.closest<HTMLElement>('.echChart');
    const width = parseFloat(chart?.style.width ?? '') || 480;
    const height = parseFloat(chart?.style.height ?? '') || 240;
    this.callback(
      [
        {
          target,
          contentRect: { width, height, top: 0, left: 0 },
        } as unknown as ResizeObserverEntry,
      ],
      this
    );
  }
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver = FixedResizeObserver;
(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;
/** Every fill and stroke color Elastic Charts sets, in paint order. */
const paints: string[] = [];
const context = new Proxy(
  {},
  {
    get: (_, key) =>
      key === 'measureText'
        ? (text: string) => ({
            width: text.length * 6,
            actualBoundingBoxAscent: 8,
            actualBoundingBoxDescent: 2,
            fontBoundingBoxAscent: 9,
            fontBoundingBoxDescent: 3,
          })
        : key === 'getLineDash'
          ? () => []
          : typeof key === 'string' && key.startsWith('create')
            ? () => ({ addColorStop: () => undefined })
            : () => undefined,
    set: (_, key, value) => {
      if (key === 'fillStyle' || key === 'strokeStyle') {
        paints.push(String(value));
      }
      return true;
    },
  }
);
HTMLCanvasElement.prototype.getContext = (() => context) as never;
globalThis.Path2D = class {
  addPath() {}
  moveTo() {}
  lineTo() {}
  closePath() {}
  rect() {}
  arc() {}
  bezierCurveTo() {}
  quadraticCurveTo() {}
} as never;

const renderer = createElasticChartsRenderer({ debugState: true });
const roots: (() => void)[] = [];

afterEach(() => {
  roots.splice(0).forEach((unmount) => unmount());
});

/** A mounted chart: `redraw` renders another Scene into the same root. */
const mount = async (
  scene: Scene,
  env: SceneRenderEnv = { environment: 'browser' }
) => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  const redraw = async (next: Scene) => {
    act(() => {
      root.render(renderer.render(next, env) as never);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  };
  await redraw(scene);
  roots.push(() => {
    act(() => root.unmount());
    container.remove();
  });
  return { container, redraw };
};

const draw = async (scene: Scene, env?: SceneRenderEnv): Promise<HTMLElement> =>
  (await mount(scene, env)).container;

/** The legend Elastic Charts drew: each item's label and value. */
const legendOf = (container: HTMLElement) =>
  [...container.querySelectorAll('.echLegendItem')].map((item) => ({
    label: item.querySelector('.echLegendItem__label')?.textContent ?? '',
    value: item.querySelector('.echLegendItem__legendValue')?.textContent ?? '',
  }));

const debugState = async (scene: Scene): Promise<DebugState> =>
  debugStateIn(await draw(scene));

const debugStateIn = (container: HTMLElement): DebugState => {
  const status = container.querySelector('[data-ech-debug-state]');
  const raw = status?.getAttribute('data-ech-debug-state');
  if (!raw) {
    throw new Error('Elastic Charts wrote no DebugState');
  }
  return JSON.parse(raw) as DebugState;
};

/** Every label the Scene gives a time tick at `value`, in any band. */
const timeLabels = ({ timeTicks }: SceneAxis, value: unknown): string[] =>
  (timeTicks?.bands ?? []).flatMap(({ layers }) =>
    layers.flatMap(({ ticks }) =>
      ticks.flatMap(({ at, label }) => (at === value ? [label] : []))
    )
  );

/** Each drawn label is the category's label, a Scene time tick's, or the value through `formatAxisValue`. */
const expectLabelsFromScene = (
  drawn: { labels: string[]; values: unknown[] } | undefined,
  axis: SceneAxis,
  scene: XyScene
) => {
  expect(drawn).toBeDefined();
  const categories = new Map<unknown, string>(
    axis.scale === 'ordinal'
      ? scene.categories.map(({ x, label }) => [x, label])
      : []
  );
  const shown = drawn!.labels.map(
    (label, index) => [drawn!.values[index], label] as const
  );
  expect(shown.length).toBeGreaterThan(0);
  for (const [value, label] of shown) {
    if (axis.timeTicks) {
      expect(timeLabels(axis, value)).toContain(label);
      continue;
    }
    expect(label).toBe(
      categories.get(value) ?? formatAxisValue(scene, axis, value as number)
    );
  }
};

const horizontalScene: XyScene = {
  ...xyInteractiveScene,
  orientation: 'horizontal',
  scheme: 'dark',
  chrome: {
    text: '#DFE5EF',
    textSubdued: '#B2BDCE',
    axis: '#495A73',
    gridLine: '#2B394F',
    background: '#0B1628',
    border: '#495A73',
  },
  axes: {
    ...xyInteractiveScene.axes,
    x: { ...xyInteractiveScene.axes.x, position: 'left' },
    y: { ...xyInteractiveScene.axes.y!, position: 'bottom' },
  },
};

describe('elastic-charts renderer: xy', () => {
  it.each([
    { name: 'time series line', scene: xyTimeSeriesScene },
    { name: 'interactive stacked bars', scene: xyInteractiveScene },
    { name: 'horizontal bars in dark', scene: horizontalScene },
  ])('$name: axis labels are the Scene’s', async ({ scene }) => {
    const state = await debugState(scene);
    expectLabelsFromScene(state.axes?.x[0], scene.axes.x, scene);
    expectLabelsFromScene(state.axes?.y[0], scene.axes.y!, scene);
    expect(state.axes?.y[0]?.title).toBe(scene.axes.y?.title);
  });

  it('draws legend items in the Scene’s order, names and colors', async () => {
    const state = await debugState(xyInteractiveScene);
    expect(
      state.legend?.items.map(({ name, color }) => ({ name, color }))
    ).toEqual(
      xyInteractiveScene.legend.items.map(({ label, color }) => ({
        name: label,
        color,
      }))
    );
  });

  it('hands Elastic Charts each bar’s unstacked value, in draw order', async () => {
    const state = await debugState(xyInteractiveScene);
    expect(
      state.bars?.map(({ name, color, bars }) => ({
        name,
        color,
        heights: bars.map(({ x, y }): unknown[] => [x, y]),
      }))
    ).toEqual(
      seriesOf(xyInteractiveScene).map(({ label, color, marks }) => ({
        name: label,
        color,
        heights: marks.map(({ x, y }) => [x, y ?? 0]),
      }))
    );
  });

  it('draws line points where the Scene places its marks', async () => {
    const state = await debugState(xyTimeSeriesScene);
    const [series] = seriesOf(xyTimeSeriesScene);
    expect(state.lines?.map(({ name, color }) => ({ name, color }))).toEqual([
      { name: series!.label, color: series!.color },
    ]);
    expect(
      state.lines?.[0]?.points.map(({ x, y }): unknown[] => [x, y])
    ).toEqual(series!.marks.map(({ x, y }) => [x, y]));
  });

  it('draws on the Scene’s background', async () => {
    const container = await draw(horizontalScene);
    const background = container.querySelector<HTMLElement>(
      '.echChartBackground'
    );
    expect(background?.style.backgroundColor).toBe('rgb(11, 22, 40)');
  });
});

describe('elastic-charts renderer: xy layer order', () => {
  const LINE = '#ff0000';
  const RANGE = '#00ff00';
  const rgba = (hex: string) =>
    `rgba(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)}, 1)`;
  const reference: XySceneLayer = {
    kind: 'referenceLine',
    line: {
      axis: 'y',
      value: 100,
      color: LINE,
      strokeWidth: 1,
      strokeDash: 'solid',
      textPosition: 'auto',
    },
  };
  const range: XySceneLayer = {
    kind: 'annotation',
    annotation: {
      kind: 'range',
      fill: 'inside',
      from: xyInteractiveScene.categories[0]!.x as number,
      to: xyInteractiveScene.categories[1]!.x as number,
      color: RANGE,
      tooltip: { entries: [] },
    },
  };
  const series = xyInteractiveScene.layers.filter(
    ({ kind }) => kind === 'series'
  );
  const bar = seriesOf(xyInteractiveScene)[0]!.color;

  /** Where Elastic Charts first paints each color. */
  const paintOrder = async (layers: XyScene['layers']) => {
    paints.length = 0;
    await draw({ ...xyInteractiveScene, layers });
    const first = (hex: string) => {
      const at = paints.findIndex(
        (paint) =>
          paint.toLowerCase() === hex.toLowerCase() ||
          paint.replace(/\s/g, '') === rgba(hex).replace(/\s/g, '')
      );
      expect(at, `${hex} painted`).toBeGreaterThanOrEqual(0);
      return at;
    };
    return { line: first(LINE), range: first(RANGE), bar: first(bar) };
  };

  it('paints helper layers before the first series beneath the series', async () => {
    const order = await paintOrder([reference, range, ...series]);
    expect(order.line).toBeLessThan(order.bar);
    expect(order.range).toBeLessThan(order.bar);
  });

  it('paints a reference line after a series above it, and a range beneath it as Kibana does', async () => {
    const order = await paintOrder([...series, range, reference]);
    expect(order.range).toBeLessThan(order.bar);
    expect(order.bar).toBeLessThan(order.line);
  });
});

describe('elastic-charts renderer: xy legend actions', () => {
  const filterOut = chartEventExamples.find(
    ({ name }) => name === 'Filter out a legend item'
  )!.event;
  const { negate: _negate, ...filterFor } = filterOut as ChartEvent & {
    negate?: boolean;
  };

  it.each([
    { action: 'Filter for Other', event: filterFor },
    { action: 'Filter out Other', event: filterOut },
  ])('$action raises the legend item’s event', async ({ action, event }) => {
    const events: ChartEvent[] = [];
    const container = await draw(xyInteractiveScene, {
      environment: 'browser',
      nodeId: filterOut.node,
      onEvent: (raised) => events.push(raised),
    });
    const button = container.querySelector<HTMLButtonElement>(
      `button[aria-label="${action}"]`
    );
    expect(button).not.toBeNull();
    act(() => button!.click());
    expect(events).toEqual([event]);
  });

  it('offers no legend actions without onEvent', async () => {
    const container = await draw(xyInteractiveScene);
    expect(container.querySelector('button[aria-label^="Filter "]')).toBeNull();
  });
});

describe('elastic-charts renderer: a series hidden from the legend', () => {
  /** The series Elastic Charts draws; it leaves a hidden one out. */
  const drawn = (container: HTMLElement) =>
    (debugStateIn(container).bars ?? []).map(({ name }) => name);

  it('stays hidden, alone, when new data puts a series ahead of it', async () => {
    const [first] = seriesOf(xyInteractiveScene);
    const {
      key: _key,
      selection: _selection,
      ...item
    } = xyInteractiveScene.legend.items[0]!;
    const refreshed: XyScene = {
      ...xyInteractiveScene,
      layers: [
        { kind: 'series', series: { ...first!, key: 'new', label: 'New' } },
        ...xyInteractiveScene.layers,
      ],
      legend: {
        ...xyInteractiveScene.legend,
        items: [
          { ...item, key: 'new', label: 'New' },
          ...xyInteractiveScene.legend.items,
        ],
      },
    };
    const { container, redraw } = await mount(xyInteractiveScene);
    expect(drawn(container)).toEqual(['200', '404', 'Other', '(null)']);
    const label = [
      ...container.querySelectorAll<HTMLElement>('.echLegendItem__label'),
    ].find(({ textContent }) => textContent === '404');
    expect(label).toBeDefined();
    // Elastic Charts hides one series on a meta- or ctrl-click, by platform; a plain click isolates it.
    act(() => {
      label!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, metaKey: true, ctrlKey: true })
      );
    });
    expect(drawn(container)).toEqual(['200', 'Other', '(null)']);
    await redraw(refreshed);
    expect(drawn(container)).toEqual(['New', '200', 'Other', '(null)']);
  });
});

describe('elastic-charts renderer: partition legend actions', () => {
  const selectable = partitionChartExamples.find(
    ({ name }) => name === 'Selectable, pre-rendered and with provenance'
  )!.node;
  const scene = resolveChart(
    { ...selectable, legend: { ...selectable.legend, visibility: 'visible' } },
    { scheme: 'light', size: SIZE }
  );
  if (scene.kind !== 'partition') {
    throw new Error('expected a partition Scene');
  }

  it('draws Filter for and Filter out on each legend item, raising its slice’s event', async () => {
    expect(scene.legend.items.length).toBeGreaterThan(1);
    for (const item of scene.legend.items) {
      expect(item.selection).toBeDefined();
      for (const negate of [false, true]) {
        const events: ChartEvent[] = [];
        const container = await draw(scene, {
          environment: 'browser',
          nodeId: 'pie',
          onEvent: (raised) => events.push(raised),
        });
        const button = container.querySelector<HTMLButtonElement>(
          `button[aria-label="Filter ${negate ? 'out' : 'for'} ${item.label}"]`
        );
        expect(button, `${item.label}, negate ${negate}`).not.toBeNull();
        act(() => button!.click());
        expect(events).toEqual([selectEvent('pie', item.selection!, negate)]);
      }
    }
  });

  it('offers no legend actions without onEvent', async () => {
    const container = await draw(scene);
    expect(container.querySelector('button[aria-label^="Filter "]')).toBeNull();
  });
});

describe('elastic-charts renderer: xy tooltip', () => {
  const tooltip = (scene: XyScene, marks: readonly [number, number][]) => {
    const series = seriesOf(scene);
    const values = marks.map(([index, mark]) => ({
      datum: { ...series[index]!.marks[mark]!, series: index, mark },
    }));
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
      React.createElement(sceneTooltip(scene), { values } as never)
    );
    return {
      header: page.querySelector('.echTooltipHeader')?.textContent,
      rows: [...page.querySelectorAll('[role="row"]')].map((row) =>
        [
          ...row.querySelectorAll(
            '[role="gridcell"]:not(.echTooltip__colorCell)'
          ),
        ].map((cell) => cell.textContent)
      ),
      colors: [...page.querySelectorAll('.echTooltip__colorStrip[style]')].map(
        (strip) => strip.getAttribute('style')
      ),
    };
  };

  it('heads with the hovered category’s Scene label, then lists each series’ name and mark label', () => {
    const [first, second] = seriesOf(xyInteractiveScene);
    const { header, rows } = tooltip(xyInteractiveScene, [
      [0, 1],
      [1, 1],
    ]);
    const category = xyInteractiveScene.categories.find(
      ({ x }) => x === first!.marks[1]!.x
    );
    expect(header).toBe(category!.label);
    expect(rows).toEqual([
      [first!.label, first!.marks[1]!.label],
      [second!.label, second!.marks[1]!.label],
    ]);
  });

  it('keeps a category’s authored label on a continuous axis', () => {
    const scene: XyScene = {
      ...xyTimeSeriesScene,
      categories: xyTimeSeriesScene.categories.map((category) => ({
        ...category,
        label: `bucket ${category.label}`,
      })),
    };
    expect(tooltip(scene, [[0, 0]]).header).toBe(scene.categories[0]!.label);
  });

  it('colors each row with its series’ color', () => {
    const { colors } = tooltip(xyInteractiveScene, [[0, 1]]);
    expect(colors).toHaveLength(1);
    expect(colors[0]).toContain(seriesOf(xyInteractiveScene)[0]!.color);
  });
});

describe('elastic-charts renderer: partition tooltip', () => {
  const nested = resolveChart(
    partitionChartExamples.find(
      ({ name }) => name === 'Nested pie with values'
    )!.node,
    { scheme: 'light', size: SIZE }
  );
  if (nested.kind !== 'partition') {
    throw new Error('expected a partition Scene');
  }

  /** The `customTooltip` the specs install, shown for the slices of `path`, outermost first, as Elastic Charts reports a hover. */
  const hover = (scene: PartitionScene, path: readonly PartitionNode[]) => {
    const tooltip = React.Children.toArray(
      (
        sceneSpecs(scene, { environment: 'browser' }) as React.ReactElement<{
          children: React.ReactNode;
        }>
      ).props.children
    ).find(
      (child): child is React.ReactElement<{ customTooltip: CustomTooltip }> =>
        React.isValidElement(child) && child.type === Tooltip
    )?.props.customTooltip;
    expect(tooltip, 'an installed custom tooltip').toBeDefined();
    const values = path.map(({ key }) => ({
      seriesIdentifier: { key, specId: 'partition' },
    }));
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
      React.createElement(tooltip!, { values } as never)
    );
    return {
      rows: [...page.querySelectorAll('[role="row"]')].map((row) =>
        [
          ...row.querySelectorAll(
            '[role="gridcell"]:not(.echTooltip__colorCell)'
          ),
        ].map((cell) => cell.textContent)
      ),
      colors: [...page.querySelectorAll('.echTooltip__colorStrip[style]')].map(
        (strip) => strip.getAttribute('style')
      ),
    };
  };

  it('lists a nested slice and each slice it sits in, with their values, shares and colors', () => {
    const outer = nested.nodes[0]!;
    const inner = outer.children[0]!;
    expect(inner).toBeDefined();
    const { rows, colors } = hover(nested, [outer, inner]);
    expect(rows).toEqual(
      [outer, inner].map(({ label, valueText, percentText }) => [
        label,
        `${valueText}\u00A0(${percentText})`,
      ])
    );
    expect(colors).toHaveLength(2);
    expect(colors[0]).toContain(outer.color);
    expect(colors[1]).toContain(inner.color);
  });

  it('shows the outermost slice alone when it is hovered', () => {
    const outer = nested.nodes[1]!;
    expect(hover(nested, [outer]).rows).toEqual([
      [outer.label, `${outer.valueText}\u00A0(${outer.percentText})`],
    ]);
  });
});

describe('elastic-charts renderer: metric', () => {
  it('shows a secondary tooltip label from the keyboard', async () => {
    const [tile] = metricSingleValueScene.tiles;
    const scene: MetricScene = {
      ...metricSingleValueScene,
      tiles: [
        {
          ...tile!,
          secondary: {
            text: '+5%',
            color: '#ff00ff',
            label: 'last week',
            labelPlacement: 'tooltip',
          },
        },
      ],
    };
    const container = await draw(scene);
    const trigger = container.querySelector<HTMLElement>(
      '.echSecondaryMetric[tabindex="0"]'
    );
    expect(trigger).not.toBeNull();
    const tooltip = () => {
      const drawn = document.querySelector('.echSecondaryMetric__tooltip');
      // Outside the chart, whose tiles clip their overflow.
      expect(drawn?.closest('.echChart') ?? null).toBeNull();
      return drawn?.textContent ?? undefined;
    };
    expect(tooltip()).toBeUndefined();
    act(() => trigger!.focus());
    expect(document.activeElement).toBe(trigger);
    expect(tooltip()).toBe('last week');
    act(() => {
      trigger!.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      );
    });
    expect(tooltip()).toBeUndefined();
    act(() => trigger!.blur());
    act(() => trigger!.focus());
    expect(tooltip()).toBe('last week');
    act(() => trigger!.blur());
    expect(tooltip()).toBeUndefined();
  });

  it('draws the secondary tooltip inside the chart’s shadow root', async () => {
    const [tile] = metricSingleValueScene.tiles;
    const scene: MetricScene = {
      ...metricSingleValueScene,
      tiles: [
        {
          ...tile!,
          secondary: {
            text: '+5%',
            color: '#ff00ff',
            label: 'last week',
            labelPlacement: 'tooltip',
          },
        },
      ],
    };
    const host = document.createElement('div');
    document.body.appendChild(host);
    const shadow = host.attachShadow({ mode: 'open' });
    const container = document.createElement('div');
    shadow.appendChild(container);
    const root = createRoot(container);
    act(() => {
      root.render(renderer.render(scene, { environment: 'browser' }) as never);
    });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    roots.push(() => {
      act(() => root.unmount());
      host.remove();
    });
    const trigger = shadow.querySelector<HTMLElement>(
      '.echSecondaryMetric[tabindex="0"]'
    );
    expect(trigger).not.toBeNull();
    act(() => trigger!.focus());
    const drawn = shadow.querySelector('.echSecondaryMetric__tooltip');
    expect(drawn?.textContent).toBe('last week');
    expect(drawn?.parentNode).toBe(shadow);
    expect(document.querySelector('.echSecondaryMetric__tooltip')).toBeNull();

    // Follows the trigger when a scroller inside the shadow root, or the page, scrolls.
    const at = (top: number, left: number) =>
      ({ top, left, width: 40, height: 10 }) as DOMRect;
    trigger!.getBoundingClientRect = () => at(50, 100);
    act(() => {
      container.dispatchEvent(new Event('scroll'));
    });
    const style = () => {
      const node = shadow.querySelector<HTMLElement>(
        '.echSecondaryMetric__tooltip'
      );
      expect(node?.classList).toContain(elastic.tooltip.readableName);
      return [
        node?.style.getPropertyValue(vars.anchor.top.propName),
        node?.style.getPropertyValue(vars.anchor.left.propName),
      ];
    };
    expect(style()).toEqual(['50px', '120px']);
    trigger!.getBoundingClientRect = () => at(10, 30);
    act(() => {
      document.dispatchEvent(new Event('scroll'));
    });
    expect(style()).toEqual(['10px', '50px']);
    act(() => trigger!.blur());
    expect(shadow.querySelector('.echSecondaryMetric__tooltip')).toBeNull();
  });

  it('prints the Scene’s title and value', async () => {
    const container = await draw(metricSingleValueScene);
    const [tile] = metricSingleValueScene.tiles;
    expect(container.textContent).toContain(tile!.title);
    expect(container.textContent).toContain(tile!.value.text);
  });

  it.each([
    { placement: 'before', text: 'last week +5%' },
    { placement: 'after', text: '+5% last week' },
    { placement: 'tooltip', text: 'last week +5%' },
  ] as const)(
    'draws unbadged secondary text in the Scene’s color, label $placement',
    async ({ placement, text }) => {
      const [tile] = metricSingleValueScene.tiles;
      const scene: MetricScene = {
        ...metricSingleValueScene,
        tiles: [
          {
            ...tile!,
            secondary: {
              text: '+5%',
              color: '#ff00ff',
              label: 'last week',
              labelPlacement: placement,
            },
          },
        ],
      };
      const container = await draw(scene);
      const secondary = container.querySelector<HTMLElement>(
        '.echSecondaryMetric'
      );
      expect(secondary?.classList).toContain(elastic.secondary.readableName);
      expect(secondary?.style.getPropertyValue(vars.ink.color.propName)).toBe(
        '#ff00ff'
      );
      expect(secondary?.textContent?.replace(/\s+/g, ' ').trim()).toBe(text);
    }
  );
});

const SIZE = { width: 480, height: 240 };

const resolvedCases = <Node>(
  examples: readonly { name: string; node: Node }[]
) =>
  (['light', 'dark'] as const).flatMap((scheme) =>
    examples.map(({ name, node }) => ({
      name: `${name} (${scheme})`,
      node,
      scheme,
    }))
  );

describe('elastic-charts renderer: resolved xyChart examples', () => {
  it.each(resolvedCases(xyChartExamples))('$name', async ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'xy') {
      throw new Error('expected an xy Scene');
    }
    const state = await debugState(scene);
    for (const drawn of state.axes?.x ?? []) {
      expectLabelsFromScene(drawn, scene.axes.x, scene);
    }
    for (const drawn of state.axes?.y ?? []) {
      const axis = scene.axes[drawn.id as 'y' | 'y2'];
      expect(axis).toBeDefined();
      expectLabelsFromScene(drawn, axis!, scene);
    }
    const series = seriesOf(scene).map(({ label, color }) => ({
      name: label,
      color,
    }));
    const drawn = [
      ...(state.bars ?? []),
      ...(state.lines ?? []),
      ...(state.areas ?? []),
    ].map(({ name, color }) => ({ name, color }));
    expect(drawn).toHaveLength(series.length);
    expect(drawn).toEqual(expect.arrayContaining(series));
    if (scene.legend.visible) {
      expect(
        state.legend?.items.map(({ name, color }) => ({ name, color }))
      ).toEqual(
        scene.legend.items.map(({ label, color }) => ({ name: label, color }))
      );
    }
  });
});

describe('elastic-charts renderer: resolved metric examples', () => {
  it.each(resolvedCases(metricExamples))('$name', async ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'metric') {
      throw new Error('expected a metric Scene');
    }
    const text = (await draw(scene)).textContent ?? '';
    for (const { title, value, secondary } of scene.tiles) {
      expect(text).toContain(title);
      expect(text).toContain(value.text);
      if (secondary) {
        expect(text).toContain(secondary.text);
      }
    }
  });
});

describe('elastic-charts renderer: resolved partitionChart examples', () => {
  it.each(resolvedCases(partitionChartExamples))(
    '$name',
    async ({ node, scheme }) => {
      const scene = resolveChart(node, { scheme, size: SIZE });
      if (scene.kind !== 'partition') {
        throw new Error('expected a partition Scene');
      }
      if (scene.empty) {
        const container = await draw(scene);
        expect(container.textContent).toBe(scene.empty.text);
        expect(container.querySelector('.echChart')).toBeNull();
        const image = container.querySelector<HTMLElement>('[role="img"]')!;
        // Its note in the Scene's subdued text, on its background, at its size.
        expect(image.classList).toContain(elastic.empty.readableName);
        expect(
          [
            vars.empty.ink,
            vars.empty.fill,
            vars.empty.width,
            vars.empty.height,
          ].map(({ propName }) => image.style.getPropertyValue(propName))
        ).toEqual([
          scene.chrome.textSubdued,
          scene.chrome.background,
          `${SIZE.width}px`,
          `${SIZE.height}px`,
        ]);
        expect(image.getAttribute('aria-label')).toBe(
          scene.title ?? scene.empty.text
        );
        if (scene.title !== undefined) {
          const described = image.getAttribute('aria-describedby');
          expect(
            described && container.ownerDocument.getElementById(described)
          ).toHaveProperty('textContent', scene.empty.text);
        }
        return;
      }
      const container = await draw(scene);
      const state = debugStateIn(container);
      // Elastic Charts names each slice by its key; a waffle reports each square.
      const drawn = [
        ...new Map(
          (state.partition?.[0]?.partitions ?? []).map(
            ({ name, depth, color, value }) => [
              name,
              { key: name, depth, color, value },
            ]
          )
        ).values(),
      ];
      const slices = slicesOf(scene.nodes).map(
        ({ key, depth, color, value }) => ({ key, depth, color, value })
      );
      expect(drawn).toHaveLength(slices.length);
      expect(drawn).toEqual(expect.arrayContaining(slices));
      if (scene.legend.visible) {
        expect(legendOf(container)).toEqual(
          scene.legend.items.map(({ label, value }) => ({
            label,
            value: value ?? '',
          }))
        );
      }
    }
  );
});

describe('elastic-charts renderer: partition order and text', () => {
  const nested = partitionChartExamples.find(
    ({ name }) => name === 'Nested pie with values'
  )!.node;

  it('lays slices out in the Scene’s order, as a nested legend lists them', async () => {
    const scene = resolveChart(nested, { scheme: 'light', size: SIZE });
    expect(legendOf(await draw(scene)).map(({ label }) => label)).toEqual(
      slicesOf(scene.nodes).map(({ label }) => label)
    );
  });

  it('labels each slice with its own value label, and legend values with their value text', () => {
    const scene = resolveChart(nested, { scheme: 'light', size: SIZE });
    const format = partitionValueFormatter(scene);
    slicesOf(scene.nodes).forEach((slice, index) => {
      expect(format(-1 - index)).toBe(slice.valueLabel);
      expect(format(slice.value)).toBe(slice.valueText);
    });
  });

  it('prints no legend value for a sum whose slices read differently', () => {
    const scene = resolveChart(
      {
        type: 'partitionChart',
        shape: 'pie',
        metrics: [{ column: 'size' }, { column: 'count' }],
        data: {
          columns: [
            {
              id: 'size',
              label: 'Size',
              type: 'number',
              role: 'metric',
              format: { kind: 'bytes' },
            },
            { id: 'count', label: 'Count', type: 'number', role: 'metric' },
          ],
          rows: [[1024, 1024]],
        },
      },
      { scheme: 'light', size: SIZE }
    );
    const [size, count] = slicesOf(scene.nodes);
    expect(size!.value).toBe(count!.value);
    expect(size!.valueText).not.toBe(count!.valueText);
    expect(partitionValueFormatter(scene)(1024)).toBe('');
  });

  it('reads legend values only among the slices the legend lists', () => {
    const scene = resolveChart(
      {
        type: 'partitionChart',
        shape: 'pie',
        groups: [{ column: 'g' }, { column: 'h' }],
        metrics: [{ column: 'v' }],
        legend: { values: true },
        data: {
          columns: [
            { id: 'g', label: 'g', type: 'string', role: 'dimension' },
            { id: 'h', label: 'h', type: 'string', role: 'dimension' },
            { id: 'v', label: 'v', type: 'number', role: 'metric' },
          ],
          rows: [
            ['a', 'x', 5],
            ['a', 'y', 0],
          ],
          display: { v: ['five', '0'] },
        },
      },
      { scheme: 'light', size: SIZE }
    );
    if (scene.kind !== 'partition') {
      throw new Error('expected a partition Scene');
    }
    const [parent] = scene.nodes;
    const child = parent!.children.find(({ label }) => label === 'x')!;
    expect(scene.legend.items.map(({ key }) => key)).toEqual([parent!.key]);
    expect(child.value).toBe(parent!.value);
    expect(child.valueText).not.toBe(parent!.valueText);
    expect(partitionValueFormatter(scene)(parent!.value)).toBe(
      parent!.valueText
    );
  });

  it('lays out sums past the largest number in their shares, with their legend values', async () => {
    const scene = resolveChart(
      {
        type: 'partitionChart',
        shape: 'pie',
        groups: [{ column: 'g' }],
        metrics: [{ column: 'v' }],
        legend: { values: true, visibility: 'visible' },
        data: {
          columns: [
            { id: 'g', label: 'g', type: 'string', role: 'dimension' },
            { id: 'v', label: 'v', type: 'number', role: 'metric' },
          ],
          rows: [
            ['a', Number.MAX_VALUE],
            ['a', Number.MAX_VALUE],
            ['b', Number.MAX_VALUE],
            ['b', Number.MAX_VALUE],
            ['c', Number.MAX_VALUE],
          ],
        },
      },
      { scheme: 'light', size: SIZE }
    );
    if (scene.kind !== 'partition') {
      throw new Error('expected a partition Scene');
    }
    const container = await draw(scene);
    const drawn = new Map(
      (debugStateIn(container).partition?.[0]?.partitions ?? []).map(
        ({ name, value }) => [name, value]
      )
    );
    const total = [...drawn.values()].reduce((sum, value) => sum + value, 0);
    expect(Number.isFinite(total)).toBe(true);
    for (const { key, share } of scene.nodes) {
      expect(drawn.get(key)! / total).toBeCloseTo(share, 12);
    }
    expect(legendOf(container).map(({ value }) => value)).toEqual(
      scene.legend.items.map(({ value }) => value)
    );
  });
});

describe('elastic-charts renderer', () => {
  it('draws metric, xy, partition, heatmap, gauge and tagCloud in the browser', () => {
    expect(renderer.id).toBe('elastic-charts');
    expect(renderer.environments).toEqual(['browser']);
    expect(renderer.supports('metric')).toBe(true);
    expect(renderer.supports('xy')).toBe(true);
    expect(renderer.supports('partition')).toBe(true);
    expect(renderer.supports('heatmap')).toBe(true);
    expect(renderer.supports('gauge')).toBe(true);
    expect(renderer.supports('tagCloud')).toBe(true);
    expect(renderer.supports('table')).toBe(false);
    expect(renderer.supports('legacyMetric')).toBe(false);
  });

  it('fills its container, so the chart shim gives it the size spec’s box', () => {
    expect(renderer.fluid).toBe(true);
  });
});

describe('elastic-charts renderer: resolved heatmap examples', () => {
  it.each(resolvedCases(heatmapExamples))('$name', async ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'heatmap') {
      throw new Error('expected a heatmap Scene');
    }
    const container = await draw(scene);
    if (scene.empty) {
      expect(container.textContent).toBe(scene.empty.text);
      expect(container.querySelector('.echChart')).toBeNull();
      return;
    }
    const state = debugStateIn(container);
    const cells = state.heatmap?.cells ?? [];
    expect(cells).toHaveLength(scene.cells.length);
    for (const { datum, formatted } of cells) {
      const cell =
        scene.cells[(datum as { originalIndex: number }).originalIndex]!;
      expect(['', cell.valueText]).toContain(formatted);
    }
    expect(state.axes?.y?.[0]?.labels).toEqual(
      scene.y.categories.map(({ label }) => label)
    );
    if (scene.legend.visible) {
      expect(legendOf(container).map(({ label }) => label)).toEqual(
        scene.bands.map(({ label }) => label)
      );
    }
  });
});

describe('elastic-charts renderer: heatmap text', () => {
  const scene = resolveChart(
    heatmapExamples.find(({ name }) => name === 'Hourly by host')!.node,
    { scheme: 'light', size: SIZE }
  );
  if (scene.kind !== 'heatmap') {
    throw new Error('expected a heatmap Scene');
  }

  it('writes each cell its own value text, and none for a value two cells write differently', () => {
    const format = heatmapValueFormatter(scene);
    for (const { value, valueText } of scene.cells) {
      expect(format(value)).toBe(valueText);
    }
    const [first] = scene.cells;
    const clash = {
      ...scene,
      cells: [first!, { ...first!, y: 1, valueText: 'other' }],
    };
    expect(heatmapValueFormatter(clash)(first!.value)).toBe('');
  });

  it('shows a hovered cell’s positions and value, with its color', () => {
    const cell = scene.cells[4]!;
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
      React.createElement(heatmapTooltip(scene), {
        values: [
          {
            datum: {
              x: scene.x.categories[cell.x]!.x,
              y: cell.y,
              value: cell.value,
            },
          },
        ],
      } as never)
    );
    expect(
      [...page.querySelectorAll('[role="row"]')].map((row) =>
        [
          ...row.querySelectorAll(
            '[role="gridcell"]:not(.echTooltip__colorCell)'
          ),
        ].map((one) => one.textContent)
      )
    ).toEqual([
      [scene.x.label, scene.x.categories[cell.x]!.label],
      [scene.y.label, scene.y.categories[cell.y]!.label],
      [scene.valueLabel, cell.valueText],
    ]);
    expect(page.innerHTML).toContain(cell.color);
  });
});

describe('elastic-charts renderer: a heatmap time axis', () => {
  const DAY = 86_400_000;
  // Midnights in Toronto (UTC-5), as ES|QL buckets a day in that zone.
  const start = Date.UTC(2026, 10, 3, 5);
  const days = [0, 1, 2, 3].map((day) => start + day * DAY);
  const node = (axes?: Record<string, unknown>) =>
    ({
      type: 'heatmap',
      data: {
        columns: [
          {
            id: 'day',
            label: 'day',
            type: 'date',
            role: 'dimension',
            format: { kind: 'date', day: 'numeric', timeZone: 'UTC' },
          },
          { id: 'os', label: 'os', type: 'string', role: 'dimension' },
          { id: 'n', label: 'n', type: 'number', role: 'metric' },
        ],
        rows: days.flatMap((day, index) => [
          [day, 'osx', index + 1],
          [day, 'ios', index + 5],
        ]),
      },
      x: { column: 'day', interval: DAY },
      y: { column: 'os' },
      value: { column: 'n' },
      ...(axes ? { axes } : {}),
    }) as HeatmapNode;
  const drawn = async (scene: Scene) => {
    const state = await debugState(scene);
    return {
      cells: state.heatmap?.cells.length,
      columns: (state.axes?.x?.[0]?.values ?? []).length,
    };
  };

  // A date format in UTC over buckets that start at Toronto's midnights laid
  // the grid on UTC's, which held no cell.
  it('draws every cell whose bucket starts off UTC midnight', async () => {
    const scene = resolveChart(node(), {
      scheme: 'light',
      size: { width: 600, height: 300 },
      timeZone: 'America/Toronto',
    });
    expect(scene.kind === 'heatmap' && scene.cells).toHaveLength(8);
    expect(await drawn(scene)).toEqual({ cells: 8, columns: 4 });
  });

  it('spans a custom domain with empty columns, as Lens’s `xDomain`', async () => {
    const scene = resolveChart(
      node({
        x: { domain: { kind: 'custom', min: start - 2 * DAY, max: days[3]! } },
      }),
      {
        scheme: 'light',
        size: { width: 600, height: 300 },
        timeZone: 'America/Toronto',
      }
    );
    expect(await drawn(scene)).toEqual({ cells: 8, columns: 6 });
  });
});

describe('elastic-charts renderer: resolved gauge examples', () => {
  it.each(resolvedCases(gaugeExamples))('$name', async ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'gauge') {
      throw new Error('expected a gauge Scene');
    }
    const container = await draw(scene);
    if (scene.empty) {
      expect(container.textContent).toBe(scene.empty.text);
      expect(container.querySelector('.echChart')).toBeNull();
      return;
    }
    const [drawn] = debugStateIn(container).bullet?.rows?.[0] ?? [];
    expect(drawn).toMatchObject({
      title: scene.labels.major,
      value: scene.value,
      domain: [scene.min, scene.max],
    });
    expect(drawn?.target).toBe(scene.goal?.value);
    if (scene.ticks) {
      expect(drawn?.ticks).toEqual(scene.ticks);
    }
  });
});

describe('elastic-charts renderer: gauge text and bands', () => {
  const scene = resolveChart(gaugeExamples[0]!.node, {
    scheme: 'light',
    size: SIZE,
  });
  if (scene.kind !== 'gauge') {
    throw new Error('expected a gauge Scene');
  }

  it('writes the value and goal as the Scene does, and any other value as the scale prints it', () => {
    const value = gaugeValueFormatter(scene);
    const target = gaugeTargetFormatter(scene);
    expect(value(scene.value!)).toBe(scene.valueText);
    expect(target(scene.goal!.value)).toBe(scene.goal!.text);
    expect(value(50)).toBe(formatAxisValue(scene, scene, 50));
    expect(target(50)).toBe(formatAxisValue(scene, scene, 50));
  });

  it('writes a goal the value reaches in its own text', () => {
    const reached = {
      ...scene,
      goal: { value: scene.value!, text: 'Goal text' },
    };
    expect(gaugeTargetFormatter(reached)(scene.value!)).toBe('Goal text');
    expect(gaugeValueFormatter(reached)(scene.value!)).toBe(scene.valueText);
  });

  it('passes each band’s edges and color, and a lone band as one color', () => {
    expect(gaugeColorBands(scene)).toEqual({
      steps: [0, 60, 85, 100],
      colors: scene.bands.map(({ color }) => color),
    });
    const lone = { ...scene, bands: [scene.bands[0]!] };
    expect(gaugeColorBands(lone)).toEqual([
      scene.bands[0]!.color,
      scene.bands[0]!.color,
    ]);
  });
});

describe('elastic-charts renderer: tag cloud', () => {
  // jsdom has no canvas for the word cloud to measure words with, so this
  // reads the markup; Chromium draws the words in the look gate.
  it.each(resolvedCases(tagCloudExamples))('$name', ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'tagCloud') {
      throw new Error('expected a tag cloud Scene');
    }
    const page = document.createElement('div');
    page.innerHTML = renderToStaticMarkup(
      renderer.render(scene, { environment: 'browser' }) as React.ReactElement
    );
    if (scene.empty) {
      expect(page.textContent).toBe(scene.empty.text);
      expect(page.querySelector('.echChart')).toBeNull();
      return;
    }
    // The cloud above its label, at the Scene's size, the label in its text color.
    const box = page.querySelector<HTMLElement>(
      `.${elastic.tagCloud.readableName}`
    )!;
    expect(
      [
        vars.tagCloud.width,
        vars.tagCloud.height,
        vars.tagCloud.ink,
        vars.tagCloud.fill,
      ].map(({ propName }) => box.style.getPropertyValue(propName))
    ).toEqual([
      `${SIZE.width}px`,
      `${SIZE.height}px`,
      scene.chrome.text,
      scene.chrome.background,
    ]);
    expect(
      box.querySelector(`.${elastic.tagCloudCloud.readableName} .echChart`)
    ).not.toBeNull();
    const label = box.querySelector(`.${elastic.tagCloudLabel.readableName}`);
    expect(label?.textContent ?? undefined).toBe(scene.label);
  });

  it('draws every word through one Wordcloud spec, at the Scene’s sizes and angles', () => {
    const scene = resolveChart(tagCloudExamples[0]!.node, { scheme: 'light' });
    const specs = sceneSpecs(scene, {
      environment: 'browser',
    }) as React.ReactElement<{ children: React.ReactNode }>;
    const clouds = React.Children.toArray(specs.props.children).filter(
      (child): child is React.ReactElement<Record<string, unknown>> =>
        React.isValidElement(child) && child.type === Wordcloud
    );
    expect(clouds).toHaveLength(1);
    expect(clouds[0]!.props).toMatchObject({
      data: tagCloudData(scene),
      minFontSize: scene.fontSize.min,
      maxFontSize: scene.fontSize.max,
      startAngle: scene.angles.start,
      endAngle: scene.angles.end,
      angleCount: scene.angles.count,
      weightFn: scene.scale,
    });
  });

  it('passes each word with its weight and color, naming it by index', () => {
    const scene = resolveChart(tagCloudExamples[0]!.node, { scheme: 'dark' });
    expect(tagCloudData(scene)).toEqual(
      scene.words.map(({ text, weight, color }, index) => ({
        text,
        weight,
        color,
        index,
      }))
    );
  });
});
