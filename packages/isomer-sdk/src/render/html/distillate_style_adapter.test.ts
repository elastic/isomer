/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { createDistillateHtmlStyleAdapter } from './distillate_style_adapter';

const fakeDistillery = (recorded: string[], ownModules = ['frame']) => ({
  artifactCollector: (_names: 'readable' | 'compact') => ({
    useHandles: (handles: never) => {
      for (const { readableName } of handles as { readableName: string }[]) {
        recorded.push(readableName);
      }
    },
  }),
  renderStyles: () => recorded.join(' '),
  environment: { themeVars: {} },
  registry: {
    module: (name: string) =>
      ownModules.includes(name) ? { name } : undefined,
  },
});

describe('createDistillateHtmlStyleAdapter', () => {
  it('records handles during resolveClassName and emits them from renderStyles', () => {
    const recorded: string[] = [];
    const adapter = createDistillateHtmlStyleAdapter(fakeDistillery(recorded));
    const collector = adapter.createCollector({});
    const { resolveClassName } = adapter.createRenderContext(collector, {});

    expect(
      resolveClassName?.(
        { key: 'frame.root', readableName: 'frame-root' },
        { key: 'frame.body', readableName: 'frame-body' }
      )
    ).toBe('frame-root frame-body');
    expect(adapter.renderStyles(collector, {})).toBe('frame-root frame-body');
  });

  it('asks the engine for readable names by default', () => {
    let mode: 'readable' | 'compact' | undefined;
    const adapter = createDistillateHtmlStyleAdapter({
      artifactCollector: (names) => {
        mode = names;
        return { useHandles: (_handles: never) => undefined };
      },
      renderStyles: () => '',
      environment: { themeVars: {} },
      registry: { module: () => undefined },
    });

    adapter.createCollector({});
    expect(mode).toBe('readable');
  });

  // What lets a runtime combine two Distillate packs instead of making the
  // host choose between them.
  it('owns only the handles authored in its own distillery', () => {
    const adapter = createDistillateHtmlStyleAdapter(
      fakeDistillery([], ['frame'])
    );
    const handle = (moduleName: string) => ({
      key: `${moduleName}.root`,
      readableName: `${moduleName}-root`,
      moduleName,
    });

    expect(adapter.ownsHandle?.(handle('frame'))).toBe(true);
    expect(adapter.ownsHandle?.(handle('chart'))).toBe(false);
  });

  // The `svg` surface asks for this, because an image backend evaluates no
  // `light-dark(...)` and has no color scheme to resolve it against.
  it('flattens theme vars to one scheme when the adapter option asks', () => {
    let overrides: Record<string, string> | undefined;
    const adapter = createDistillateHtmlStyleAdapter({
      artifactCollector: () => ({ useHandles: (_handles: never) => undefined }),
      renderStyles: (_collector, _resolver, options) => {
        overrides = options?.themeValueOverrides;
        return '';
      },
      environment: {
        themeVars: { 'color.text': { light: '#111', dark: '#eee' } },
      },
      registry: { module: () => undefined },
    });
    const collector = adapter.createCollector({});

    adapter.renderStyles(collector, {});
    expect(overrides).toBeUndefined();

    adapter.renderStyles(collector, {
      adapterOptions: { flattenScheme: 'dark' },
    });
    expect(overrides).toEqual({ 'color.text': '#eee' });
  });
});
