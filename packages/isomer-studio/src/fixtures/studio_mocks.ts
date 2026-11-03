/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Module factories the Studio test files hand to `vi.mock`, which each file
// must call itself so Vitest hoists it.

import { createElement } from 'react';
import { runInNewContext } from 'vm';

import type * as CompileJsx from '../model/compile_jsx';
import type { CompiledEvaluator } from '../model/compile_jsx';
import type * as ComposeLink from '../model/compose_link';

/** While set, `encodeSource` waits on it, so a test can hold an encode in flight. */
export const encodeGate = {
  current: undefined as Promise<void> | undefined,
};

export const mockCompileJsx = (actual: typeof CompileJsx) => {
  const evaluate: CompiledEvaluator = (code, scope) => {
    const context: Record<string, unknown> = { ...scope };
    runInNewContext(code, context);
    return context[actual.COMPILED_RESULT];
  };
  return {
    ...actual,
    compileCompositionJsx: (
      ...[source, shim, transformJsx]: Parameters<
        typeof actual.compileCompositionJsx
      >
    ) => actual.compileCompositionJsx(source, shim, transformJsx, { evaluate }),
    compileCompositionDocumentJsx: (
      ...[source, shim, transformJsx]: Parameters<
        typeof actual.compileCompositionDocumentJsx
      >
    ) =>
      actual.compileCompositionDocumentJsx(source, shim, transformJsx, {
        evaluate,
      }),
  };
};

export const mockComposeLink = (actual: typeof ComposeLink) => ({
  ...actual,
  encodeSource: async (source: string) => {
    const gate = encodeGate.current;
    if (gate) {
      await gate;
    }
    return actual.encodeSource(source);
  },
});

export const mockMonacoEditor = () => ({
  MonacoEditor: ({
    value,
    onChange,
    ariaLabel,
  }: {
    value: string;
    onChange: (value: string) => void;
    ariaLabel: string;
  }) =>
    createElement('textarea', {
      'aria-label': ariaLabel,
      value,
      onChange: ({ target }: { target: HTMLTextAreaElement }) =>
        onChange(target.value),
    }),
});
