/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import type { StyleHandle } from '../../define/primitive_module';
import type { DistilleryHandle, PackDistillery } from '../../pack/distillery';
import { styleScopeOf } from '../style_scope';

import { createDistillateStyleAdapter } from './distillate';

/** A stand-in Distillery that records which handles each collector saw, and the scheme it rendered in. */
const distilleryOf = (moduleName: string) => {
  const handleList: DistilleryHandle[] = [];
  const seen = new WeakMap<object, DistilleryHandle[][]>();
  const distillery: PackDistillery = {
    registry: {
      module: (name) => (name === moduleName ? { handleList } : undefined),
    },
    artifactCollector: () => {
      const calls: DistilleryHandle[][] = [];
      const collector = {
        useHandles: (handles: readonly DistilleryHandle[]) => {
          calls.push([...handles]);
        },
      };
      seen.set(collector, calls);
      return collector;
    },
    renderStyles: (collector, _, options) =>
      seen
        .get(collector)!
        .flat()
        .map(({ readableName }) => `.${readableName}{${options?.scheme ?? ''}}`)
        .join(''),
  };
  const handle = (key: string): StyleHandle => {
    const created = { key, readableName: `${moduleName}-${key}`, moduleName };
    handleList.push(created);
    return created;
  };
  return { distillery, handle };
};

describe('createDistillateStyleAdapter', () => {
  it('records each handle in the distillery that owns it and joins their stylesheets in order', () => {
    const one = distilleryOf('one');
    const two = distilleryOf('two');
    const adapter = createDistillateStyleAdapter([
      one.distillery,
      two.distillery,
    ]);
    const collector = adapter.createCollector({});
    const { resolveClassName } = adapter.createRenderContext(collector, {});

    expect(resolveClassName?.(two.handle('b'), one.handle('a'))).toBe(
      'two-b one-a'
    );
    expect(adapter.renderStyles(collector, {})).toBe('.one-a{}\n.two-b{}');
    expect(adapter.renderStyles(collector, { scheme: 'dark' })).toBe(
      '.one-a{dark}\n.two-b{dark}'
    );
  });

  it('records a handle no registry owns in the first distillery', () => {
    const one = distilleryOf('one');
    const two = distilleryOf('two');
    const stray = { key: 'x', readableName: 'stray-x', moduleName: 'stray' };
    const adapter = createDistillateStyleAdapter([
      one.distillery,
      two.distillery,
    ]);
    const collector = adapter.createCollector({});

    adapter.createRenderContext(collector, {}).resolveClassName?.(stray);

    expect(adapter.renderStyles(collector, {})).toBe('.stray-x{}');
  });

  it('collects for a distillery listed twice once', () => {
    const one = distilleryOf('one');
    const adapter = createDistillateStyleAdapter([
      one.distillery,
      one.distillery,
    ]);
    const collector = adapter.createCollector({});

    adapter
      .createRenderContext(collector, {})
      .resolveClassName?.(one.handle('a'));

    expect(adapter.renderStyles(collector, {})).toBe('.one-a{}');
  });

  it("shares one style scope across a render's passes, and a new one per render", () => {
    const { distillery } = distilleryOf('one');
    const adapter = createDistillateStyleAdapter([distillery]);
    const collector = adapter.createCollector({});
    const scope = styleScopeOf(adapter.createRenderContext(collector, {}));

    expect(scope).toBeDefined();
    expect(styleScopeOf(adapter.createRenderContext(collector, {}))).toBe(
      scope
    );
    expect(
      styleScopeOf(adapter.createRenderContext(adapter.createCollector({}), {}))
    ).not.toBe(scope);
  });
});
