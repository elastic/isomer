/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';

import { slideDeckFrame, slidesPack } from './pack';
import { slideDeckPrimitives } from './registry';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

type Path = (string | number)[];

/** Every string in `node` with its path, stopping at nested primitives, which are checked on their own. */
const stringsIn = (value: unknown, path: Path = []): Path[] => {
  if (typeof value === 'string') {
    return [path];
  }
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => stringsIn(item, [...path, index]));
  }
  if (value && typeof value === 'object') {
    if (path.length > 0 && 'type' in value) {
      return [];
    }
    return Object.entries(value).flatMap(([key, entry]) =>
      key === 'type' ? [] : stringsIn(entry, [...path, key])
    );
  }
  return [];
};

const withAppended = (value: unknown, [head, ...rest]: Path): unknown => {
  if (head === undefined) {
    return `${value as string} \`mk\``;
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).map((item, index) =>
      index === head ? withAppended(item, rest) : item
    );
  }
  const record = value as Record<string, unknown>;
  return { ...record, [head]: withAppended(record[head], rest) };
};

interface ZodDef {
  type: string;
  shape?: Record<string, ZodType>;
  element?: ZodType;
  innerType?: ZodType;
  options?: ZodType[];
}

const defOf = (schema: ZodType): ZodDef =>
  (schema as unknown as { def: ZodDef }).def;

/** Descriptions on `schema` and the wrappers around what it holds. */
const descriptionsOf = (schema: ZodType): string[] => {
  const { description } = schema;
  const { innerType } = defOf(schema);
  return [
    ...(description ? [description] : []),
    ...(innerType ? descriptionsOf(innerType) : []),
  ];
};

/** The field schema at `path`, collecting descriptions on the way down to it. */
const fieldAt = (schema: ZodType, path: Path): string[] => {
  const def = defOf(schema);
  const [head, ...rest] = path;
  if (head === undefined) {
    return descriptionsOf(schema);
  }
  if (def.innerType) {
    return fieldAt(def.innerType, path);
  }
  if (def.type === 'array' && def.element && typeof head === 'number') {
    return [...fieldAt(def.element, rest), ...descriptionsOf(schema)];
  }
  if (def.type === 'object' && def.shape && typeof head === 'string') {
    const field = def.shape[head];
    return field ? fieldAt(field, rest) : [];
  }
  if (def.type === 'union' && def.options) {
    return def.options.flatMap((option) => fieldAt(option, path));
  }
  return [];
};

const render = (node: unknown): string | undefined => {
  const composition = {
    type: 'view',
    body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
  } as Composition;
  return runtime.validate(composition).errors.length === 0
    ? runtime.surfaces.html.render(composition).html
    : undefined;
};

const renderMarkdown = (node: unknown): string =>
  runtime.surfaces.markdown.render({
    type: 'view',
    body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
  });

describe('inline marks in field descriptions', () => {
  it.each(slideDeckPrimitives.filter(({ type }) => type !== 'slideFrame'))(
    '$type says so on every field that draws marks',
    ({ schema, examples }) => {
      const missing = new Set<string>();
      for (const example of examples) {
        for (const path of stringsIn(example)) {
          const html = render(withAppended(example, path));
          if (!html?.includes('>mk</code>')) {
            continue;
          }
          const described = fieldAt(schema as ZodType, path).some((text) =>
            /marks are allowed/i.test(text)
          );
          if (!described) {
            missing.add(
              path.filter((step) => typeof step === 'string').join('.')
            );
          }
        }
      }
      expect([...missing].sort()).toEqual([]);
    }
  );

  it.each(slideDeckPrimitives.filter(({ type }) => type !== 'slideFrame'))(
    '$type draws marks on every field that says it does',
    ({ schema, examples }) => {
      const unrendered = new Set<string>();
      for (const example of examples) {
        for (const path of stringsIn(example)) {
          const says = fieldAt(schema as ZodType, path).some((text) =>
            /marks are allowed/i.test(text)
          );
          const node = withAppended(example, path);
          const html = render(node);
          if (!says || html === undefined) {
            continue;
          }
          const field = path
            .filter((step) => typeof step === 'string')
            .join('.');
          if (!html.includes('>mk</code>')) {
            unrendered.add(`${field} (html)`);
          }
          if (!renderMarkdown(node).includes('`mk`')) {
            unrendered.add(`${field} (markdown)`);
          }
        }
      }
      expect([...unrendered].sort()).toEqual([]);
    }
  );
});
