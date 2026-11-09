/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

// Renderer parity for the pack's own renderers, over every example: each
// Scene the pack draws itself carries the Scene's strings exactly, as Rendering
// and Data table state them. The chart engines' gate is in
// `@elastic/isomer-charts-elastic`'s `parity.test.ts`.

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { type Composition, primitiveExamples } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { createChartsPack } from './pack';
import type { ChartsRenderContext, ReactSceneRenderer } from './render/context';
import { legacyMetricSceneRenderer } from './render/legacy_metric';
import { summarySceneRenderer } from './render/summary_renderer';
import { tableSceneRenderer } from './render/table';
import { resolveChart } from './scene/resolve';
import { type ColorScheme, type Scene, SCENE_KINDS } from './scene/types';

interface Drawn {
  readonly example: string;
  readonly renderer: string;
  readonly scene: Scene;
  readonly root: HTMLElement;
}

const drawn: Drawn[] = [];
const resolvedKinds = new Set<Scene['kind']>();
let example = '';

const recording = (renderer: ReactSceneRenderer): ReactSceneRenderer => ({
  ...renderer,
  render: (scene, env) => {
    const output = renderer.render(scene, env);
    const root = document.createElement('div');
    root.innerHTML = renderToStaticMarkup(createElement('div', null, output));
    drawn.push({ example, renderer: renderer.id, scene, root });
    return output;
  },
});

const ownRenderers = [
  tableSceneRenderer,
  legacyMetricSceneRenderer,
  summarySceneRenderer,
];
const pack = createChartsPack({
  sceneRenderers: ownRenderers.map(recording),
  resolveScene: (node, options) => {
    const scene = resolveChart(node, options);
    resolvedKinds.add(scene.kind);
    return scene;
  },
});
const runtime = createIsomerRuntime<unknown, ChartsRenderContext>({
  packs: [pack],
});

for (const scheme of ['light', 'dark'] as ColorScheme[]) {
  for (const definition of pack.primitives) {
    for (const { name, node } of primitiveExamples(definition)) {
      example = `${definition.type}: ${name ?? '(unnamed)'} (${scheme})`;
      const composition: Composition = { type: 'view', body: [node] };
      renderToStaticMarkup(
        createElement(
          'div',
          null,
          runtime.surfaces.react.render(composition, {
            context: { environment: 'node', scheme },
            heading: false,
          })
        )
      );
    }
  }
}

const textOf = (element: Element | null | undefined) =>
  element?.textContent ?? undefined;
const textsOf = (root: ParentNode, selector: string) =>
  [...root.querySelectorAll(selector)].map((element) => element.textContent);

const notesOf = ({ interactions }: Scene) =>
  interactions.emphasis.flatMap(({ note }) => (note ? [note] : []));

/** What each of the pack's renderers must draw of a Scene. A renderer without one fails the gate. */
const contentChecks: Record<string, (drawing: Drawn) => void> = {
  [legacyMetricSceneRenderer.id]: ({ scene, root }) => {
    if (scene.kind !== 'legacyMetric') {
      throw new Error(`the legacy metric renderer drew a ${scene.kind} Scene`);
    }
    expect(
      root.querySelector('[role="group"]')?.getAttribute('aria-label')
    ).toBe(scene.summary);
    expect(textOf(root.querySelector('[data-part="empty"]'))).toBe(
      scene.empty?.text
    );
    expect(textsOf(root, '[data-part="value"]')).toEqual(
      scene.tiles.map(({ value }) => value.text)
    );
    expect(textsOf(root, '[data-part="label"]')).toEqual(
      scene.showLabels ? scene.tiles.map(({ label }) => label) : []
    );
  },
  [summarySceneRenderer.id]: ({ scene, root }) => {
    expect(textsOf(root, 'p')).toEqual([
      scene.summary,
      ...(scene.description ? [scene.description] : []),
      ...notesOf(scene),
    ]);
  },
  [tableSceneRenderer.id]: ({ scene, root }) => {
    if (scene.kind !== 'table') {
      throw new Error(`the table renderer drew a ${scene.kind} Scene`);
    }
    expect(textOf(root.querySelector('[data-part="title"]'))).toBe(scene.title);
    expect(textOf(root.querySelector('[data-part="description"]'))).toBe(
      scene.description
    );
    expect(root.querySelector('table')?.getAttribute('aria-label')).toBe(
      scene.summary
    );
    expect(textsOf(root, 'thead th')).toEqual(
      scene.columns.map(({ label }) => label)
    );
    const rows = [...root.querySelectorAll('tbody tr[data-row]')];
    if (scene.rows.length === 0) {
      expect(textOf(root.querySelector('tbody'))).toBe(scene.emptyText);
    } else {
      // The first page in the starting order, as many rows as fit.
      expect(rows.length).toBeGreaterThan(0);
      const expected = scene.order
        .slice(0, rows.length)
        .map((position) => scene.table.rows[position]!);
      expect(rows.map((row) => Number(row.getAttribute('data-row')))).toEqual(
        expected.map(({ row }) => row)
      );
      rows.forEach((row, index) => {
        expect(
          [...row.children].map((cell) => cell.textContent?.trim())
        ).toEqual(expected[index]!.cells);
      });
    }
    const footer = root.querySelector('tfoot');
    if (scene.table.footer) {
      expect(textsOf(footer!, 'td')).toEqual(scene.table.footer);
    } else {
      expect(footer).toBeNull();
    }
    expect(textsOf(root, '[data-part="note"]')).toEqual(notesOf(scene));
  },
};

describe('renderer parity: the pack’s own renderers', () => {
  it('has a content check for each', () => {
    expect(ownRenderers.filter(({ id }) => !contentChecks[id])).toEqual([]);
  });

  it('resolves every Scene kind from the examples, and draws each', () => {
    expect(resolvedKinds).toEqual(new Set(SCENE_KINDS));
    expect(new Set(drawn.map(({ scene }) => scene.kind))).toEqual(
      new Set(SCENE_KINDS)
    );
    expect(new Set(drawn.map(({ renderer }) => renderer))).toEqual(
      new Set(ownRenderers.map(({ id }) => id))
    );
  });

  it.each(drawn.map((drawing) => ({ ...drawing, kind: drawing.scene.kind })))(
    '$example: $renderer draws the $kind Scene’s strings',
    (drawing) => {
      contentChecks[drawing.renderer]!(drawing);
    }
  );
});
