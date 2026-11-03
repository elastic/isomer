/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  buildAuthoringJsonSchema,
  type Composition,
  exampleNodes,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

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
  mark = 'mk'
): unknown => {
  if (head === undefined) {
    return `${value as string} \`${mark}\``;
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).map((item, index) =>
      index === head ? withAppended(item, rest, mark) : item
    );
  }
  const record = value as Record<string, unknown>;
  return { ...record, [head]: withAppended(record[head], rest, mark) };
};

interface JsonSchema {
  $ref?: string;
  description?: string;
  properties?: Record<string, JsonSchema>;
  items?: JsonSchema;
  anyOf?: JsonSchema[];
  oneOf?: JsonSchema[];
}

/** The agent-facing schema, whose descriptions are what an author reads. */
const { $defs: defs } = buildAuthoringJsonSchema(slideDeckPrimitives) as {
  $defs: Record<string, JsonSchema>;
};

/** `schema` and each def its `$ref`s lead to. */
const layersOf = (schema: JsonSchema): JsonSchema[] => {
  const target = schema.$ref?.replace('#/$defs/', '');
  const next = target === undefined ? undefined : defs[target];
  return [schema, ...(next ? layersOf(next) : [])];
};

/** The descriptions on the field at `path`, its alternatives, and the arrays on the way down to it. */
const fieldAt = (schema: JsonSchema, path: Path): string[] => {
  const layers = layersOf(schema);
  const own = layers.flatMap(({ description }) =>
    description ? [description] : []
  );
  const [head, ...rest] = path;
  return [
    ...(head === undefined ? own : []),
    ...layers.flatMap((layer) => [
      ...[...(layer.anyOf ?? []), ...(layer.oneOf ?? [])].flatMap((option) =>
        fieldAt(option, path)
      ),
      ...(typeof head === 'number' && layer.items
        ? [...fieldAt(layer.items, rest), ...own]
        : []),
      ...(typeof head === 'string' && layer.properties?.[head]
        ? fieldAt(layer.properties[head], rest)
        : []),
    ]),
  ];
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

interface Drawn {
  /** Absent when the node with a mark in this field is invalid. */
  html?: boolean;
  markdown?: boolean;
}

/** Whether a mark appended to each of `paths` is drawn, from one render of `example` with a distinct mark in every valid field. */
const drawnMarks = (example: unknown, paths: readonly Path[]): Drawn[] => {
  const valid = paths.map((path, index) =>
    isValid(withAppended(example, path, `mk${index}`))
  );
  const marked = paths.reduce<unknown>(
    (node, path, index) =>
      valid[index] ? withAppended(node, path, `mk${index}`) : node,
    example
  );
  if (!isValid(marked)) {
    throw new Error('marks valid in each field alone are invalid together');
  }
  const html = runtime.surfaces.html.render(onSlide(marked)).html;
  const markdown = runtime.surfaces.markdown.render(onSlide(marked));
  return paths.map((_, index) =>
    valid[index]
      ? {
          html: html.includes(`>mk${index}</code>`),
          markdown: markdown.includes(`\`mk${index}\``),
        }
      : {}
  );
};

describe('inline marks in field descriptions', () => {
  const says = (type: string, path: Path) => {
    const def = defs[type];
    if (!def) {
      throw new Error(`${type} has no $def in the authoring schema`);
    }
    return fieldAt(def, path).some((text) => /marks are allowed/i.test(text));
  };
  const fieldName = (path: Path) =>
    path.filter((step) => typeof step === 'string').join('.');

  it.each(slideDeckPrimitives)(
    '$type says so on every field that draws marks',
    ({ type, examples }) => {
      const missing = new Set<string>();
      for (const example of exampleNodes({ examples })) {
        const paths = stringsIn(example);
        drawnMarks(example, paths).forEach(({ html }, index) => {
          const path = paths[index]!;
          if (html && !says(type, path)) {
            missing.add(fieldName(path));
          }
        });
      }
      expect([...missing].sort()).toEqual([]);
    }
  );

  it.each(slideDeckPrimitives)(
    '$type draws marks on every field that says it does',
    ({ type, examples }) => {
      const unrendered = new Set<string>();
      for (const example of exampleNodes({ examples })) {
        const paths = stringsIn(example).filter((path) => says(type, path));
        drawnMarks(example, paths).forEach(({ html, markdown }, index) => {
          const field = fieldName(paths[index]!);
          if (html === undefined) {
            unrendered.add(`${field} (invalid)`);
            return;
          }
          if (!html) {
            unrendered.add(`${field} (html)`);
          }
          if (!markdown) {
            unrendered.add(`${field} (markdown)`);
          }
        });
      }
      expect([...unrendered].sort()).toEqual([]);
    }
  );
});
