/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A Distillate style handle, as far as the SDK reads one. */
export interface DistilleryHandle {
  readonly key: string;
  readonly readableName: string;
  readonly moduleName: string;
}

/** The part of a Distillate `StylesCollector` the SDK calls. */
export interface DistilleryCollector {
  useHandles(handles: readonly DistilleryHandle[]): unknown;
}

/**
 * The part of a Distillate `Distillery` the SDK calls, declared structurally so
 * the SDK takes no dependency on `@elastic/distillate`.
 */
export interface PackDistillery {
  readonly registry: {
    module(
      name: string
    ): { readonly handleList: readonly object[] } | undefined;
  };
  artifactCollector(names: 'readable'): DistilleryCollector;
  renderStyles(
    collector: DistilleryCollector,
    resolver?: undefined,
    options?: { readonly scheme?: 'light' | 'dark' }
  ): string;
}
