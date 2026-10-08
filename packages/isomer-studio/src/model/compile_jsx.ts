/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactElement } from 'react';
import { createElement, Fragment } from 'react';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import type {
  CompositionAuthorProps,
  JsxShim,
} from '@elastic/isomer-sdk/author';
import { buildJsxShim } from '@elastic/isomer-sdk/author';

import type { JsxTransform } from '../types';

const RESULT = '__isomerStudioResult';

/** Builds the authoring shim once per primitive inventory. */
export const createShim = (primitives: readonly { type: string }[]): JsxShim =>
  buildJsxShim(primitives);

const isElement = (
  value: unknown
): value is ReactElement<CompositionAuthorProps> =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  'props' in value;

/** Runs compiled code with `scope` as its free variables and returns `__isomerStudioResult`. */
export type CompiledEvaluator = (
  code: string,
  scope: Readonly<Record<string, unknown>>
) => unknown;

const isRunner = (
  value: unknown
): value is (scope: Readonly<Record<string, unknown>>) => unknown =>
  typeof value === 'function';

const evaluateAsModule: CompiledEvaluator = async (code, scope) => {
  const module = `export default ({ ${Object.keys(scope).join(', ')} }) => {
  let ${RESULT};
  ${code}
  return ${RESULT};
};`;
  const url = URL.createObjectURL(
    new Blob([module], { type: 'text/javascript' })
  );
  try {
    const { default: run } = (await import(/* webpackIgnore: true */ url)) as {
      default?: unknown;
    };
    if (!isRunner(run)) {
      throw new Error('The compiled JSX did not load.');
    }
    return run(scope);
  } finally {
    URL.revokeObjectURL(url);
  }
};

/**
 * Compiles one `<Composition>` element written as authoring JSX to its body nodes.
 * Runs the source in this page as a module by default, so only feed it what the user typed.
 */
export const compileCompositionJsx = async (
  source: string,
  shim: JsxShim,
  transformJsx: JsxTransform,
  { evaluate = evaluateAsModule }: { evaluate?: CompiledEvaluator } = {}
): Promise<PrimitiveNode[]> => {
  const compiled = await transformJsx(`${RESULT} =\n${source}`);
  const components = Object.fromEntries(
    Object.entries(shim).filter(([name]) => name !== 'toComposition')
  );
  const element = await evaluate(compiled, {
    ...components,
    h: createElement,
    Fragment,
  });

  if (!isElement(element)) {
    throw new Error('The JSX did not produce an element.');
  }
  return shim.toComposition(element).body;
};
