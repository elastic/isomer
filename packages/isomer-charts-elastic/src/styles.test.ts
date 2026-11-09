/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import {
  chartsStylesheet,
  createChartsPack,
} from '@elastic/isomer-primitives-charts';
import { metricExamples } from '@elastic/isomer-primitives-charts/schema';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { createElasticChartsHeadlessRenderer } from './headless';
import { elasticChartsStylesheet, elasticModule } from './styles';

const { handles, vars } = elasticModule;

/** The declarations of `css`'s rule for `className`. */
const rule = (className: string, css = chartsStylesheet()) =>
  new RegExp(`\\.${className}\\{([^}]*)\\}`).exec(css)?.[1];

describe('elastic-charts styles', () => {
  it('reads each value a Scene sets in the property it draws', () => {
    const reads = (
      handle: { readableName: string },
      property: string,
      ref: { propName: string }
    ) =>
      expect(rule(handle.readableName)).toContain(
        `${property}:var(${ref.propName})`
      );
    reads(handles.secondary, 'color', vars.ink.color);
    reads(handles.tooltip, 'top', vars.anchor.top);
    reads(handles.tooltip, 'left', vars.anchor.left);
    reads(handles.drawing, 'width', vars.box.width);
    reads(handles.drawing, 'height', vars.box.height);
    reads(handles.fluidDrawing, 'max-width', vars.box.maxWidth);
    reads(handles.fluidDrawing, 'aspect-ratio', vars.box.aspectRatio);
  });

  it('places and lays out what it draws', () => {
    const declares = (
      handle: { readableName: string },
      ...declarations: string[]
    ) => {
      for (const declaration of declarations) {
        expect(rule(handle.readableName)).toContain(declaration);
      }
    };
    declares(
      handles.tooltip,
      'position:fixed',
      'transform:translate(-50%,-100%)',
      'pointer-events:none'
    );
    declares(handles.legendAction, 'display:inline-flex', 'gap:2px');
    declares(handles.drawing, 'display:flex');
    declares(handles.fluidDrawing, 'display:flex', 'width:100%');
  });

  it('ships its own rules alone, as the pack’s stylesheet writes them', () => {
    const own = elasticChartsStylesheet();
    for (const handle of Object.values(handles)) {
      expect(rule(handle.readableName, own)).toBe(rule(handle.readableName));
    }
    expect(
      own
        .match(/\.[\w-]+\{/g)
        ?.every((selector) => selector.startsWith('.chartsElastic-'))
    ).toBe(true);
  });

  it('reaches the html and snapshot surfaces when the engine draws', () => {
    const runtime = createIsomerRuntime({
      frames: {
        page: {
          defaultWidth: 800,
          theme: { light: {}, dark: {} },
          estimateHeight: () => 400,
          wrap: (_header, body) => createElement('main', null, ...body),
        },
      },
      packs: [
        createChartsPack({
          sceneRenderers: [createElasticChartsHeadlessRenderer()],
        }),
      ],
    });
    const composition: Composition = {
      type: 'view',
      body: [metricExamples[0]!.node],
    };
    const { body, css } = runtime.surfaces.html.render(composition);
    expect(body).toContain(`class="${handles.drawing.readableName}"`);
    expect(rule(handles.drawing.readableName, css)).toBe(
      rule(handles.drawing.readableName)
    );
    const snapshot = runtime.surfaces.snapshot.render(composition);
    expect(snapshot.html).toContain(`class="${handles.drawing.readableName}"`);
    expect(rule(handles.drawing.readableName, snapshot.css)).toBe(
      rule(handles.drawing.readableName)
    );
  });
});
