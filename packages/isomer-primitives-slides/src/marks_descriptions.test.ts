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

const withAppended = (
  value: unknown,
  [head, ...rest]: Path,
  marker: string
): unknown => {
  if (head === undefined) {
    return `${value as string} \`${marker}\``;
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).map((item, index) =>
      index === head ? withAppended(item, rest, marker) : item
    );
  }
  const record = value as Record<string, unknown>;
  return { ...record, [head]: withAppended(record[head], rest, marker) };
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

const onSlide = (node: unknown): Composition => {
  const primitive = node as PrimitiveNode;
  return {
    type: 'view',
    body: [
      primitive.type === 'slideFrame'
        ? primitive
        : ({ type: 'slideFrame', body: [primitive] } as PrimitiveNode),
    ],
  };
};

const isValid = (node: unknown): boolean =>
  runtime.validate(onSlide(node)).errors.length === 0;

interface MarkedField {
  path: Path;
  /** `false` when appending a mark alone makes the node invalid. */
  valid: boolean;
  html: boolean;
  markdown: boolean;
}

/** Whether each string field of `example` draws a mark appended to it, from one render with a distinct mark in every valid field. */
const markedFields = (example: unknown): MarkedField[] => {
  const paths = stringsIn(example).map((path, index) => ({
    path,
    marker: `mk${index}`,
  }));
  const valid = paths.filter(({ path, marker }) =>
    isValid(withAppended(example, path, marker))
  );
  const node = valid.reduce<unknown>(
    (marked, { path, marker }) => withAppended(marked, path, marker),
    example
  );
  const composition = onSlide(node);
  const { html } = runtime.surfaces.html.render(composition);
  const markdown = runtime.surfaces.markdown.render(composition);
  return paths.map(({ path, marker }) => {
    const isMarked = valid.some((field) => field.marker === marker);
    return {
      path,
      valid: isMarked,
      html: isMarked && html.includes(`>${marker}</code>`),
      markdown: isMarked && markdown.includes(`\`${marker}\``),
    };
  });
};

const fieldsOf = new Map(
  slideDeckPrimitives.map(({ type, examples }) => [
    type,
    examples.flatMap((example) => markedFields(example)),
  ])
);

const fieldName = (path: Path): string =>
  path.filter((step) => typeof step === 'string').join('.');

const saysMarks = (schema: ZodType, path: Path): boolean =>
  fieldAt(schema, path).some((text) => /marks are allowed/i.test(text));

describe('inline marks in field descriptions', () => {
  it.each(slideDeckPrimitives)(
    '$type says so on every field that draws marks',
    ({ type, schema }) => {
      const missing = new Set(
        (fieldsOf.get(type) ?? [])
          .filter(
            ({ path, html }) => html && !saysMarks(schema as ZodType, path)
          )
          .map(({ path }) => fieldName(path))
      );
      expect([...missing].sort()).toEqual([]);
    }
  );

  it.each(slideDeckPrimitives)(
    '$type draws marks on every field that says it does',
    ({ type, schema }) => {
      const unrendered = new Set(
        (fieldsOf.get(type) ?? [])
          .filter(({ path }) => saysMarks(schema as ZodType, path))
          .flatMap(({ path, valid, html, markdown }) =>
            !valid
              ? [`${fieldName(path)} (invalid)`]
              : [
                  ...(html ? [] : [`${fieldName(path)} (html)`]),
                  ...(markdown ? [] : [`${fieldName(path)} (markdown)`]),
                ]
          )
      );
      expect([...unrendered].sort()).toEqual([]);
    }
  );
});
