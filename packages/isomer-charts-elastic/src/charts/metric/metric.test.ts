/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { createRoot } from 'react-dom/client';
import { resolveChart } from '@elastic/isomer-primitives-charts/resolve';
import {
  type MetricScene,
  metricSingleValueScene,
} from '@elastic/isomer-primitives-charts/scene';
import { metricExamples } from '@elastic/isomer-primitives-charts/schema';
import { describe, expect, it } from 'vitest';

import {
  act,
  draw,
  renderer,
  resolvedCases,
  roots,
  SIZE,
} from '../../shared/render.fixtures';
import { elasticModule } from '../../shared/styles';

import { metricDatum } from './metric';

const { handles: elastic, vars } = elasticModule;

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

  it('keeps an open secondary tooltip and its focus when the host draws again', async () => {
    const [tile] = metricSingleValueScene.tiles;
    const sceneWith = (text: string): MetricScene => ({
      ...metricSingleValueScene,
      tiles: [
        {
          ...tile!,
          secondary: {
            text,
            color: '#ff00ff',
            label: 'last week',
            labelPlacement: 'tooltip',
          },
        },
      ],
    });
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const render = async (scene: MetricScene) => {
      act(() => {
        root.render(
          renderer.render(scene, { environment: 'browser' }) as never
        );
      });
      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 0));
      });
    };
    roots.push(() => {
      act(() => root.unmount());
      container.remove();
    });
    const trigger = () =>
      container.querySelector<HTMLElement>('.echSecondaryMetric[tabindex="0"]');
    const tooltip = () =>
      document.querySelector('.echSecondaryMetric__tooltip')?.textContent;

    await render(sceneWith('+5%'));
    const first = trigger();
    expect(first).not.toBeNull();
    act(() => first!.focus());
    expect(tooltip()).toBe('last week');

    await render(sceneWith('+6%'));
    expect(trigger()).toBe(first);
    expect(first!.textContent).toContain('+6%');
    expect(document.activeElement).toBe(first);
    expect(tooltip()).toBe('last week');
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

describe('elastic-charts renderer: resolved metric examples', () => {
  it.each(resolvedCases(metricExamples))('$name', async ({ node, scheme }) => {
    const scene = resolveChart(node, { scheme, size: SIZE });
    if (scene.kind !== 'metric') {
      throw new Error('expected a metric Scene');
    }
    const container = await draw(scene);
    const text = container.textContent ?? '';
    if (scene.empty) {
      expect(text).toBe(scene.empty.text);
      expect(container.querySelector('.echChart')).toBeNull();
      return;
    }
    for (const { title, value, secondary } of scene.tiles) {
      expect(text).toContain(title);
      expect(text).toContain(value.text);
      if (secondary) {
        expect(text).toContain(secondary.text);
      }
    }
  });
});

describe('metricDatum', () => {
  it('hands Elastic Charts the comparison badge glyph as its icon', () => {
    const [tile] = metricSingleValueScene.tiles;
    const badged = {
      ...tile!,
      secondary: {
        labelPlacement: 'before' as const,
        text: '+5%',
        color: '#000000',
        badge: {
          direction: 'increase' as const,
          color: '#00ff00',
          showIcon: true,
          icon: '↑',
        },
      },
    };
    expect(metricDatum(badged).extra).toMatchObject({
      value: '+5%',
      icon: '↑',
    });
  });
});
