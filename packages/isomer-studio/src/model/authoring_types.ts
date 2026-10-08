/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuntimeAuthoringContext } from '@elastic/isomer-runtime';
import type { AnyPrimitiveDefinition } from '@elastic/isomer-sdk';
import { buildAuthoringDeclarations } from '@elastic/isomer-sdk/author';

import { createShim } from './compile_jsx';

type SchemaNode = Record<string, unknown>;

/** The module the SDK declares the authoring components in, and the editor's `jsxImportSource`. */
export const AUTHORING_MODULE = '@elastic/isomer-authoring';

/** What the editors check against: TypeScript declarations for JSX, a JSON Schema for JSON. */
export interface AuthoringTypes {
  declarations: string;
  bodySchema: SchemaNode;
}

/**
 * The SDK's authoring module, plus a global per shim component, since the editor's source uses
 * them without importing.
 */
export const authoringDeclarations = (
  schema: SchemaNode,
  primitives: readonly AnyPrimitiveDefinition[]
): string => {
  const names = Object.keys(createShim(primitives)).filter(
    (name) => name !== 'toComposition'
  );
  return [
    buildAuthoringDeclarations(schema, primitives, {
      jsx: true,
      moduleName: AUTHORING_MODULE,
    }),
    ...names.map(
      (name) =>
        `declare const ${name}: typeof import(${JSON.stringify(AUTHORING_MODULE)}).${name};`
    ),
  ].join('\n\n');
};

/** A JSON Schema for the JSON editor: one body node, or an array of them. */
export const bodyJsonSchema = ({
  bodySchema,
}: Pick<RuntimeAuthoringContext, 'bodySchema'>): SchemaNode => {
  const { $defs, items } = bodySchema;
  if (!items) {
    return {};
  }
  return { $defs, oneOf: [items, { type: 'array', minItems: 1, items }] };
};
