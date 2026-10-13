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
  /** Property name on the primitive's component, e.g. `Item`. */
  member: string;
  /** What the member's elements carry as {@link authorType}, e.g. `slideList.Item`. */
  authorType: string;
  path: readonly AuthoredChildField[];
}

/** The {@link AuthoringChild.authorType} of `field`'s elements under the primitive `owner`. */
export const memberType = (
  owner: string,
  { name }: Pick<AuthoredChildField, 'name'>
): string => `${owner}.${capitalize(name)}`;

export const createAuthoringModel = (
  primitives: readonly { type: string; schema?: unknown; children?: unknown }[]
) => {
  const authoredByType = new Map<string, AuthoredSpec>();
  const membersByType = new Map<string, AuthoringChild[]>();
  const collectMembers = (type: string, spec: AuthoredSpec): void => {
    const members = new Map<string, AuthoringChild>();
    const visited = new Set<ZodType>();
    const collect = (
      fields: readonly AuthoredChildField[],
      path: readonly AuthoredChildField[]
    ): void => {
      const siblings = new Set<string>();
      for (const field of fields) {
        const member = capitalize(field.name);
        const prior = members.get(member);
        if (
          prior &&
          (!isSameChild(prior.field, field) || siblings.has(member))
        ) {
          throw new IsomerError(
            'DUPLICATE_AUTHORED_CHILD',
            `buildJsxShim: "${prior.field.field}" and "${field.field}" both become <${capitalize(type)}.${member}>`
          );
        }
        siblings.add(member);
        const nextPath = [...path, field];
        if (!prior) {
          members.set(member, {
            field,
            primitiveType: type,
            member,
            authorType: memberType(type, field),
            path: nextPath,
          });
        }
        if (field.toItem || visited.has(field.itemSchema)) {
          continue;
        }
        visited.add(field.itemSchema);
        collect(readAuthoredSpec(field.itemSchema).children, nextPath);
      }
    };
    collect(spec.children, []);
    if (members.size > 0) {
      membersByType.set(type, [...members.values()]);
    }
  };
  for (const { type, schema } of primitives) {
    if (!isZodType(schema)) {
      continue;
    }
    const spec = readAuthoredSpec(schema);
    if (
      spec.children.length === 0 &&
      spec.text.length === 0 &&
      !spec.nodes?.length
    ) {
      continue;
    }
    authoredByType.set(type, spec);
    collectMembers(type, spec);
  }
  const typeByName = new Map([['Composition', 'view']]);
  for (const { type } of primitives) {
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
  const holderByType = new Map(
    primitives.map(({ type }) => [type, `the primitive "${type}"`])
  );
  for (const { authorType, primitiveType, member } of [
    ...membersByType.values(),
  ].flat()) {
    const holder = `the member ${member} of "${primitiveType}"`;
    const earlier = holderByType.get(authorType);
    if (earlier !== undefined) {
      throw new IsomerError(
        'DUPLICATE_PRIMITIVE_TYPE',
        `buildJsxShim: ${earlier} and ${holder} share the type "${authorType}"`
      );
    }
    holderByType.set(authorType, holder);
  }
  const childSlotsByType = new Map(
    primitives.map(({ type, children }) => {
      const walked = inferChildSlots(children);
      const nodes = (authoredByType.get(type)?.nodes ?? []).filter(
        ({ field }) => !walked.some((slot) => slot.field === field)
      );
      return [
        type,
        [...walked, ...nodes.map(({ array, field }) => ({ array, field }))],
      ];
    })
  );
  return { authoredByType, membersByType, childSlotsByType };
};

const isSameChild = (a: AuthoredChildField, b: AuthoredChildField): boolean =>
  a.itemSchema === b.itemSchema &&
  a.propsSchema === b.propsSchema &&
  a.toItem === b.toItem &&
  a.textField === b.textField;

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
