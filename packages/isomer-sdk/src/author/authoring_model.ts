/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodType } from 'zod';

import { IsomerError } from '../composition/error';
import type { PrimitiveNode } from '../define/primitive_module';

import {
  type AuthoredChildField,
  type AuthoredSpec,
  readAuthoredSpec,
} from './authored_fields';

export interface ChildSlot {
  array: boolean;
  field: string;
}

export interface AuthoringChild {
  field: AuthoredChildField;
  primitiveType: string;
  path: readonly AuthoredChildField[];
}

export const createAuthoringModel = (
  primitives: readonly { type: string; schema?: unknown; children?: unknown }[]
) => {
  const authoredByType = new Map<string, AuthoredSpec>();
  const children = new Map<string, AuthoringChild>();
  const visited = new Set<ZodType>();
  const collectChildren = (
    fields: readonly AuthoredChildField[],
    primitiveType: string,
    path: readonly AuthoredChildField[]
  ): void => {
    for (const field of fields) {
      const prior = children.get(field.childType);
      if (prior && prior.field.signature !== field.signature) {
        throw new IsomerError(
          'DUPLICATE_AUTHORED_CHILD',
          `Child type "${field.childType}" is branded with incompatible item or props input schemas.`
        );
      }
      const nextPath = [...path, field];
      if (!prior) {
        children.set(field.childType, { field, primitiveType, path: nextPath });
      }
      if (field.toItem || visited.has(field.itemSchema)) {
        continue;
      }
      visited.add(field.itemSchema);
      collectChildren(
        readAuthoredSpec(field.itemSchema).children,
        primitiveType,
        nextPath
      );
    }
  };
  for (const { type, schema } of primitives) {
    if (!isZodType(schema)) {
      continue;
    }
    const spec = readAuthoredSpec(schema);
    if (spec.children.length === 0 && spec.text.length === 0) {
      continue;
    }
    authoredByType.set(type, spec);
    collectChildren(spec.children, type, []);
  }
  const typeByName = new Map([['Composition', 'view']]);
  for (const type of [
    ...primitives.map(({ type }) => type),
    ...children.keys(),
  ]) {
    const name = capitalize(type);
    const earlier = typeByName.get(name);
    if (earlier !== undefined && earlier !== type) {
      throw new IsomerError(
        'DUPLICATE_PRIMITIVE_TYPE',
        `buildJsxShim: "${earlier}" and "${type}" both become the component ${name}`
      );
    }
    typeByName.set(name, type);
  }
  const childSlotsByType = new Map(
    primitives.map(({ type, children }) => [type, inferChildSlots(children)])
  );
  return { authoredByType, children, childSlotsByType };
};

const isZodType = (schema: unknown): schema is ZodType =>
  typeof schema === 'object' && schema !== null && '_zod' in schema;

/**
 * Reads {@link PrimitiveDefinition.children} against a probe node so JSX can
 * fill the same fields a tree walk would visit. Paths like `body[0]` are array
 * slots; a bare `header` is a single nested node.
 */
export const inferChildSlots = (children: unknown): readonly ChildSlot[] => {
  if (typeof children !== 'function') {
    return [];
  }
  const probeNode: PrimitiveNode = { type: '__probe__' };
  const node = new Proxy(
    {},
    {
      get(_target, prop) {
        if (prop === 'type') {
          return probeNode.type;
        }
        return [probeNode];
      },
    }
  );
  try {
    const refs = (children as (value: unknown) => unknown)(node);
    if (!Array.isArray(refs)) {
      return [];
    }
    const byField = new Map<string, boolean>();
    for (const ref of refs) {
      if (!isChildRef(ref)) {
        continue;
      }
      const field = /^[A-Za-z_]\w*/.exec(ref.path)?.[0];
      if (!field) {
        continue;
      }
      byField.set(
        field,
        byField.get(field) === true || /\[\d+\]/.test(ref.path)
      );
    }
    return [...byField.entries()].map(([field, array]) => ({ array, field }));
  } catch {
    return [];
  }
};

const isChildRef = (value: unknown): value is { path: string } =>
  typeof value === 'object' &&
  value !== null &&
  'path' in value &&
  typeof value.path === 'string';

export const capitalize = (value: string): string =>
  `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
