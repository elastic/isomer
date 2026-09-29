/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import { slideDeckPrimitives } from '../registry';
import { frameBodyCharacters } from '../theme/components/frame';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

type Path = (string | number)[];

const stringPaths = (value: unknown, path: Path = []): Path[] => {
  if (typeof value === 'string') {
    return path.at(-1) === 'type' ? [] : [path];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry, index) =>
      stringPaths(entry, [...path, index])
    );
  }
  if (typeof value === 'object' && value !== null) {
    return Object.entries(value).flatMap(([key, entry]) =>
      stringPaths(entry, [...path, key])
    );
  }
  return [];
};

const replaceAt = (
  value: unknown,
  [head, ...rest]: Path,
  text: string
): unknown => {
  if (head === undefined) {
    return text;
  }
  if (Array.isArray(value)) {
    return (value as unknown[]).map((entry, index) =>
      index === head ? replaceAt(entry, rest, text) : entry
    );
  }
  const record = value as Record<string, unknown>;
  return { ...record, [head]: replaceAt(record[head], rest, text) };
};

const onSlide = (node: PrimitiveNode): PrimitiveNode =>
  node.type === 'slideFrame'
    ? node
    : ({ type: 'slideFrame', body: [node] } as PrimitiveNode);

const cases = slideDeckPrimitives.flatMap(({ type, examples }) =>
  examples.flatMap((example, index) =>
    stringPaths(example).map((path) => ({
      name: `${type}#${index} ${path.join('.')}`,
      node: onSlide(
        replaceAt(
          example,
          path,
          'x'.repeat(frameBodyCharacters + 1)
        ) as PrimitiveNode
      ),
    }))
  )
);

describe('authored text', () => {
  it.each(cases)('$name refuses more than a slide can draw', ({ node }) => {
    expect(runtime.validate({ type: 'view', body: [node] }).valid).toBe(false);
  });
});
