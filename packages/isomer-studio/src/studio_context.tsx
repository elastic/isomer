/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createContext, useContext } from 'react';
import type { PrimitiveNode, StyledRenderContext } from '@elastic/isomer-sdk';
import type { Composition } from '@elastic/isomer-sdk';
import type { JsxShim } from '@elastic/isomer-sdk/author';
import type { ZodType } from 'zod';

import type { StudioRuntime, StudioTheme } from './config';
import type { RuntimeDocs } from './model/describe_runtime';
import type { JsxTransform, RasterizePng } from './types';

export type { StudioTheme } from './config';

export interface StudioContextValue {
  runtime: StudioRuntime;
  docs: RuntimeDocs;
  shim: JsxShim;
  schemaFor: (type: string) => ZodType | undefined;
  theme: StudioTheme;
  /** Wraps nodes in the pack's composition for the current theme, through `composeExample`. */
  compose: (nodes: readonly PrimitiveNode[]) => Composition;
  createReactContext?: ((root: ShadowRoot) => StyledRenderContext) | undefined;
  transformJsx?: JsxTransform | undefined;
  rasterizePng?: RasterizePng | undefined;
}

const StudioContext = createContext<StudioContextValue | undefined>(undefined);

export const StudioContextProvider = StudioContext.Provider;

export const useStudio = (): StudioContextValue => {
  const value = useContext(StudioContext);
  if (!value) {
    throw new Error('useStudio must be used inside IsomerStudio.');
  }
  return value;
};
