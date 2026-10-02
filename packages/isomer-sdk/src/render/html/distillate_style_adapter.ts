/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode, StyleHandle } from '../../define/primitive_module';

import type { HTMLStyleAdapter } from './envelope';

/** One theme custom property, with both schemes it folds into `light-dark(...)`. */
export interface DistillateThemeVar {
  readonly light: string;
  readonly dark: string;
}

/**
 * A Distillate `Distillery` (or anything with the same shape). The SDK does not depend on Distillate.
 */
export interface DistillateHtmlEngine<TCollector> {
  artifactCollector: (names: 'readable' | 'compact') => TCollector;
  renderStyles: (
    collector: TCollector,
    resolver?: undefined,
    options?: { themeValueOverrides?: Record<string, string> }
  ) => string;
  /** Theme-tree path to its per-scheme values, for {@link HTMLRenderOptions.scheme}. */
  environment: { themeVars: Readonly<Record<string, DistillateThemeVar>> };
  /** Distillate's per-distillery `StyleRegistry`, which answers {@link HTMLStyleAdapter.ownsHandle}. */
  registry: { module: (name: string) => unknown };
}

/** The {@link HTMLStyleAdapter.styleCollector} tag a Distillate-backed pack declares. */
export const DISTILLATE_STYLE_COLLECTOR = 'distillate';

/**
 * HTML style adapter for a Distillate-shaped engine: record handles during render, emit their stylesheet.
 */
export const createDistillateHtmlStyleAdapter = <
  TCollector extends { useHandles: (handles: never) => void },
>(
  distillery: DistillateHtmlEngine<TCollector>,
  names: 'readable' | 'compact' = 'readable'
): HTMLStyleAdapter<PrimitiveNode, TCollector> => ({
  styleCollector: DISTILLATE_STYLE_COLLECTOR,
  createCollector: () => distillery.artifactCollector(names),
  createRenderContext: (collector) => ({
    resolveClassName: (...handles: StyleHandle[]) => {
      collector.useHandles(handles as never);
      return handles.map(({ readableName }) => readableName).join(' ');
    },
  }),
  renderStyles: (collector, { scheme }) => {
    if (!scheme) {
      return distillery.renderStyles(collector);
    }
    const themeValueOverrides = Object.fromEntries(
      Object.entries(distillery.environment.themeVars).map(([path, values]) => [
        path,
        values[scheme],
      ])
    );
    return distillery.renderStyles(collector, undefined, {
      themeValueOverrides,
    });
  },
  // A Distillate handle carries the module it was authored in, and each distillery owns a private registry.
  ownsHandle: (handle) =>
    distillery.registry.module(
      (handle as { moduleName?: string }).moduleName ?? ''
    ) !== undefined,
});
