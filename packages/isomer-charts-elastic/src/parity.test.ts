/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Event parity over every example: every gesture this engine maps, sent to the
// callbacks and legend action its specs install on `Settings`, raises the
// event of the Scene part it lands on, and nothing where the node offers none.

import {
  Children,
  createElement,
  Fragment,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Settings } from '@elastic/charts';
import {
  type ChartsRenderContext,
  createChartsPack,
} from '@elastic/isomer-primitives-charts';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  brushEvent,
  type ChartEvent,
  type PartitionScene,
  type Scene,
  type SceneRenderEnv,
  selectEvent,
} from '@elastic/isomer-primitives-charts/scene';
import type { MetricNode } from '@elastic/isomer-primitives-charts/schema';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { type Composition, primitiveExamples } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { seriesOf, type XyDatum } from './events';
import { sceneSpecs } from './specs';

/**
 * Every Scene the charts pack resolves for every example, nested charts
 * included, recorded where the pack hands it to a renderer.
 */
const exampleScenes = (): { example: string; scene: Scene }[] => {
  const scenes: { example: string; scene: Scene }[] = [];
  let example = '';
  const pack = createChartsPack({
    sceneRenderers: [
      {
        id: 'recording',
        environments: ['node'],
        supports: (kind) => kind !== 'table',
        render: (scene) => {
          scenes.push({ example, scene });
          return null;
        },
      },
    ],
  });
  const runtime = createIsomerRuntime<unknown, ChartsRenderContext>({
    packs: [pack],
  });
  for (const definition of pack.primitives) {
    for (const { name, node } of primitiveExamples(definition)) {
      example = `${definition.type}: ${name ?? '(unnamed)'}`;
      const composition: Composition = { type: 'view', body: [node] };
      renderToStaticMarkup(
        createElement(
          'div',
          null,
          runtime.surfaces.react.render(composition, {
            context: { environment: 'node', scheme: 'light' },
            heading: false,
          })
        )
      );
    }
  }
  return scenes;
};

// Every gesture the browser engine maps, built from what Elastic Charts
// reports for it, and the event the Scene part it lands on carries.
const NODE = 'parity';

const listen = () => {
  const events: ChartEvent[] = [];
  return {
    events,
    env: {
      environment: 'browser' as const,
      nodeId: NODE,
      onEvent: (event: ChartEvent) => events.push(event),
    },
  };
};

type Props = Record<string, unknown>;
type Callback = (...args: unknown[]) => unknown;

/** `node` and every element beneath it, fragments and children included. */
const elementsOf = (node: ReactNode): ReactElement<Props>[] =>
  Children.toArray(node).flatMap((child) => {
    if (!isValidElement<Props>(child)) {
      return [];
    }
    const nested = elementsOf(child.props.children as ReactNode);
    return child.type === Fragment ? nested : [child, ...nested];
  });

/**
 * What the browser engine installs for `scene`: the `Settings` callbacks and
 * each series spec's id and data, read from the specs `<Chart>` is given.
 */
const installed = (scene: Scene, env: SceneRenderEnv) => {
  const elements = elementsOf(sceneSpecs(scene, env));
  const settings = elements.find(({ type }) => type === Settings)?.props;
  expect(settings, 'a Settings spec').toBeDefined();
  const callback = (name: string) => settings![name] as Callback | undefined;
  const series = elements.flatMap(({ props }) =>
    typeof props.id === 'string' && /^series-\d+$/.test(props.id)
      ? [{ id: props.id, data: props.data as readonly XyDatum[] }]
      : []
  );
  return { callback, series };
};

const gestures = (
  scene: Scene
): { gesture: string; raise: () => ChartEvent[]; expected: ChartEvent[] }[] => {
  // An empty Scene draws its note alone, so it installs no handler.
  if ('empty' in scene && scene.empty) {
    return [];
  }
  if (scene.kind === 'metric') {
    return scene.tiles.flatMap((tile, index) =>
      tile.selection
        ? [
            {
              gesture: `click tile ${index}`,
              raise: () => {
                const { events, env } = listen();
                installed(scene, env).callback('onElementClick')?.([
                  {
                    type: 'metricElementEvent',
                    rowIndex: Math.floor(index / scene.layout.columns),
                    columnIndex: index % scene.layout.columns,
                  },
                ]);
                return events;
              },
              expected: [selectEvent(NODE, tile.selection)],
            },
          ]
        : []
    );
  }
  if (scene.kind === 'partition') {
    const offersSlices = scene.interactions.select.includes('slice');
    const paths = (
      nodes: PartitionScene['nodes'],
      keys: readonly string[]
    ): { keys: string[]; node: PartitionScene['nodes'][number] }[] =>
      nodes.flatMap((node) => [
        { keys: [...keys, node.key], node },
        ...paths(node.children, [...keys, node.key]),
      ]);
    const slices = paths(scene.nodes, []).map(({ keys, node }) => ({
      gesture: `click ${node.label}`,
      raise: () => {
        const { events, env } = listen();
        installed(scene, env).callback('onElementClick')?.([
          [
            keys.map((key, depth) => ({
              groupByRollup: key,
              value: node.value,
              depth: depth + 1,
              sortIndex: 0,
              path: [],
              smAccessorValue: '',
            })),
            { specId: 'partition', key: 'spec{partition}' },
          ],
        ]);
        return events;
      },
      expected:
        offersSlices && node.selection
          ? [selectEvent(NODE, node.selection)]
          : [],
    }));
    // The buttons the installed legend action draws for each legend item.
    const legend = scene.legend.items.flatMap((item) =>
      [false, true].map((negate) => {
        const gesture = `filter ${negate ? 'out' : 'for'} ${item.label}`;
        return {
          gesture,
          raise: () => {
            const { events, env } = listen();
            const action = installed(scene, env).callback('legendAction');
            if (action) {
              const button = elementsOf(
                action({
                  series: [{ key: item.key }],
                  label: item.label,
                }) as ReactNode
              ).find(
                ({ type, props }) =>
                  type === 'button' &&
                  props['aria-label'] ===
                    `Filter ${negate ? 'out' : 'for'} ${item.label}`
              );
              expect(button, `${gesture}: its button`).toBeDefined();
              (button!.props.onClick as Callback)();
            }
            return events;
          },
          expected:
            offersSlices && item.selection
              ? [selectEvent(NODE, item.selection, negate)]
              : [],
        };
      })
    );
    return [...slices, ...legend];
  }
  if (scene.kind === 'heatmap') {
    const offersCells = scene.interactions.select.includes('cell');
    const clicks = scene.cells.map((cell, index) => ({
      gesture: `click ${cell.description}`,
      raise: () => {
        const { events, env } = listen();
        installed(scene, env).callback('onElementClick')?.([
          [
            {
              datum: {
                x: cell.x,
                y: cell.y,
                value: cell.value,
                originalIndex: index,
              },
              value: cell.value,
              formatted: cell.valueText,
            },
            { specId: 'heatmap', key: 'spec{heatmap}' },
          ],
        ]);
        return events;
      },
      expected:
        offersCells && cell.selection
          ? [selectEvent(NODE, cell.selection)]
          : [],
    }));
    const xs = scene.x.categories
      .map(({ x }) => x)
      .filter((x): x is number => typeof x === 'number');
    const brush =
      scene.x.scale === 'time' && xs.length > 1
        ? [
            {
              gesture: 'brush across the time axis',
              raise: () => {
                const { events, env } = listen();
                installed(scene, env).callback('onBrushEnd')?.({
                  x: [xs[0]!, xs.at(-1)! + scene.x.interval!],
                  y: [],
                  cells: [],
                });
                return events;
              },
              expected: [
                brushEvent(scene, NODE, [
                  xs[0]!,
                  xs.at(-1)! + scene.x.interval!,
                ]),
              ].flatMap((event) => (event ? [event] : [])),
            },
          ]
        : [];
    return [...clicks, ...brush];
  }
  if (scene.kind === 'tagCloud') {
    const offersTags = scene.interactions.select.includes('tag');
    return scene.words.map((word, index) => ({
      gesture: `click ${word.text}`,
      raise: () => {
        const { events, env } = listen();
        installed(scene, env).callback('onElementClick')?.([
          [
            { text: word.text, weight: word.weight, color: word.color, index },
            { specId: 'tagCloud', key: 'tagCloud' },
          ],
        ]);
        return events;
      },
      expected:
        offersTags && word.selection ? [selectEvent(NODE, word.selection)] : [],
    }));
  }
  if (scene.kind !== 'xy') {
    return [];
  }
  const offers = (target: string) =>
    (scene.interactions.select as readonly string[]).includes(target);
  const categoryAt = (x: number | string) =>
    scene.categories.find((category) => category.x === x);
  const series = seriesOf(scene);
  // Each Scene mark, and the datum at its x and y in its series' spec.
  const marks = series.flatMap((one, index) =>
    one.marks.map((mark) => {
      const selection = offers('datum')
        ? mark.selection
        : offers('category')
          ? categoryAt(mark.x)?.selection
          : undefined;
      const gesture = `click ${one.label} at ${String(mark.x)}`;
      return {
        gesture,
        raise: () => {
          const { events, env } = listen();
          const { callback, series: specs } = installed(scene, env);
          const spec = specs.find(({ id }) => id === `series-${index}`);
          const datum = spec?.data.find(
            ({ x, y }) => x === mark.x && y === mark.y
          );
          expect(datum, `${gesture}: its datum`).toBeDefined();
          callback('onElementClick')?.([
            [
              { x: datum!.x, y: datum!.y, mark: null, accessor: 'y1', datum },
              { specId: spec!.id, key: spec!.id },
            ],
          ]);
          return events;
        },
        expected: selection ? [selectEvent(NODE, selection)] : [],
      };
    })
  );
  const categories = scene.categories.map((category) => ({
    gesture: `click the plot at ${category.label}`,
    raise: () => {
      const { events, env } = listen();
      installed(scene, env).callback('onProjectionClick')?.({ x: category.x });
      return events;
    },
    expected:
      offers('category') && category.selection
        ? [selectEvent(NODE, category.selection)]
        : [],
  }));
  // The buttons the installed legend action draws for each series' item.
  const legend = series.flatMap((one, index) =>
    [false, true].map((negate) => {
      const item = scene.legend.items.find(
        ({ key, series: { layer, y } }) =>
          key === one.key && layer === one.series.layer && y === one.series.y
      );
      const gesture = `filter ${negate ? 'out' : 'for'} ${one.label}`;
      return {
        gesture,
        raise: () => {
          const { events, env } = listen();
          const { callback, series: specs } = installed(scene, env);
          const action = callback('legendAction');
          if (action) {
            const spec = specs.find(({ id }) => id === `series-${index}`);
            const button = elementsOf(
              action({
                series: [{ specId: spec!.id }],
                label: one.label,
              }) as ReactNode
            ).find(
              ({ type, props }) =>
                type === 'button' &&
                props['aria-label'] ===
                  `Filter ${negate ? 'out' : 'for'} ${one.label}`
            );
            expect(button, `${gesture}: its button`).toBeDefined();
            (button!.props.onClick as Callback)();
          }
          return events;
        },
        expected:
          offers('legend') && item?.selection
            ? [selectEvent(NODE, item.selection, negate)]
            : [],
      };
    })
  );
  const xs = scene.categories
    .map(({ x }) => x)
    .filter((x): x is number => typeof x === 'number');
  const brush =
    xs.length > 1
      ? [
          {
            gesture: 'brush across the x axis',
            raise: () => {
              const { events, env } = listen();
              installed(scene, env).callback('onBrushEnd')?.({
                x: [xs[0]!, xs.at(-1)!],
              });
              return events;
            },
            expected: [brushEvent(scene, NODE, [xs[0]!, xs.at(-1)!])].flatMap(
              (event) => (event ? [event] : [])
            ),
          },
        ]
      : [];
  return [...marks, ...categories, ...legend, ...brush];
};

describe('event parity over every example', () => {
  // Each scheme resolves the same selections, so light is enough. No metric
  // example offers `tile`, so each is also resolved offering it.
  const tiles = primitiveExamples(
    createChartsPack().primitives.find(({ type }) => type === 'metric')!
  ).map(({ name, node }) => ({
    example: `metric: ${name ?? '(unnamed)'}, offering tile`,
    scene: resolveChart(
      { ...node, interactions: { select: ['tile'] } } as MetricNode,
      { scheme: 'light' }
    ),
  }));
  const scenes = [...exampleScenes(), ...tiles];
  const interactive = scenes.filter(
    ({ scene }) =>
      scene.interactions.select.length > 0 || scene.interactions.brush
  );

  it('covers examples that offer every target and a brush', () => {
    const offered = new Set(
      interactive.flatMap(({ scene }) => scene.interactions.select)
    );
    expect([...offered].sort()).toEqual(
      expect.arrayContaining([
        'category',
        'cell',
        'datum',
        'legend',
        'slice',
        'tile',
      ])
    );
    expect(interactive.some(({ scene }) => scene.interactions.brush)).toBe(
      true
    );
  });

  it.each(scenes.map((drawing) => ({ ...drawing, kind: drawing.scene.kind })))(
    '$example: every gesture on the $kind raises the Scene’s event, and only where the node offers it',
    ({ scene }) => {
      for (const { gesture, raise, expected } of gestures(scene)) {
        expect(raise(), gesture).toEqual(expected);
      }
    }
  );
});
