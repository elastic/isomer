/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chartsStylesheet } from '@elastic/isomer-primitives-charts';
import { describe, expect, it } from 'vitest';

import { EMPTY_LINE_HEIGHT } from './empty';
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
    declares(
      handles.empty,
      'display:flex',
      `line-height:${EMPTY_LINE_HEIGHT}px`,
      'text-align:center'
    );
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
});
