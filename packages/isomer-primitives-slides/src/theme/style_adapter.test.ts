/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StyleHandle } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDistillery } from './distillery';
import { deckRootModule, layoutModule } from './modules';
import { createDistillateStyleAdapter } from './style_adapter';

const fill = layoutModule.handles.fill as unknown as StyleHandle;
const deckRoot = deckRootModule.handles.root as unknown as StyleHandle;

const render = (handle: StyleHandle, scheme?: 'light' | 'dark') => {
  const adapter = createDistillateStyleAdapter(slideDistillery);
  const collector = adapter.createCollector({});
  const { resolveClassName } = adapter.createRenderContext(collector, {});
  const className = resolveClassName?.(handle) ?? '';
  return {
    className,
    css: adapter.renderStyles(collector, scheme ? { scheme } : {}),
  };
};

describe('createDistillateStyleAdapter', () => {
  it('writes the class names its stylesheet defines', () => {
    const { className, css } = render(fill);

    expect(className).toBe('layout-fill');
    expect(css).toContain(`.${className}{`);
  });

  it('owns only the handles authored in its own distillery', () => {
    const adapter = createDistillateStyleAdapter(slideDistillery);

    expect(adapter.ownsHandle?.(fill)).toBe(true);
    expect(
      adapter.ownsHandle?.({
        key: 'chart.root',
        readableName: 'chart-root',
        moduleName: 'chart',
      } as StyleHandle)
    ).toBe(false);
  });

  // The `snapshot` surface asks for one scheme: an image backend evaluates no `light-dark(...)`.
  it('resolves theme values to the requested scheme', () => {
    const { dark } = slideDistillery.environment.themeVars['color/text']!;

    expect(render(deckRoot).css).toContain('light-dark(');
    expect(render(deckRoot, 'dark').css).not.toContain('light-dark(');
    expect(render(deckRoot, 'dark').css).toContain(dark);
  });
});
