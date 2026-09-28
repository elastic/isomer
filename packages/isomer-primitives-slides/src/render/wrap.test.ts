/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import {
  contentRight,
  inFrame,
  runtime,
  textRightEdge,
} from '../primitives/wrap.fixtures';
import { slideDeckPrimitives } from '../registry';

type Path = readonly (string | number)[];

interface Leaf {
  path: Path;
  /** `type.field.subfield`, named from the innermost node holding the leaf. */
  field: string;
}

// A long unbroken word, such as a URL or an identifier.
const tokenLength = 120;

const nowrap =
  'nowrap or pre text with no length bound yet (elastic/isomer#25)';

/** Fields that do not wrap a long word, keyed as {@link Leaf.field}, with the rule that bounds them. */
const skipped: Record<string, string> = {
  'slideColumns.footnote.code': `a fixed-width footnote code; ${nowrap}`,
  'slideDelta.after.value': nowrap,
  'slideDelta.before.value': nowrap,
  'slideDiff.lines.text': nowrap,
  'slideFanout.source': nowrap,
  'slideLanes.join': nowrap,
  'slideLanes.lanes.steps': `a step chip; ${nowrap}`,
  'slideLayers.layers.chips': nowrap,
  'slideLayers.layers.owner': nowrap,
  'slidePipeline.end': `a terminal; ${nowrap}`,
  'slidePipeline.start': `a terminal; ${nowrap}`,
  'slideQuadrant.quadrants.items': `a chip; ${nowrap}`,
  'slideQuadrant.x.low': `widens its side column, which pushes the plot's chips out; ${nowrap}`,
  'slideSequence.messages.label': nowrap,
  'slideStat.unit': `inside the value; ${nowrap}`,
  'slideStat.value': nowrap,
  'slideStats.items.unit': `inside the value; ${nowrap}`,
  'slideStats.items.value': nowrap,
  'slideTitle.definition.term': nowrap,
  'slideTree.entries.name': nowrap,
  'slideWindow.title': `the title bar; ${nowrap}`,
};

/** Skipped only for the examples `when` accepts. */
const skippedWhen: Record<
  string,
  { reason: string; when: (example: PrimitiveNode) => boolean }
> = {
  'slideCode.panels.lines': {
    reason:
      'pre text bounded for the full slide width, not a container’s narrower column',
    when: ({ type }) => type !== 'slideCode',
  },
  'slidePipeline.steps.title': {
    reason: `a chip in spans mode; ${nowrap}`,
    when: (example) =>
      ((example as { spans?: unknown[] }).spans?.length ?? 0) > 0,
  },
};

const isNode = (value: unknown): value is PrimitiveNode =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as { type?: unknown }).type === 'string';

// An embedded composition is drawn scaled and clipped by its panel, so it is left out.
const stringLeaves = (value: unknown, path: Path = [], field = ''): Leaf[] => {
  if (typeof value === 'string') {
    return [{ path, field }];
  }
  if (typeof value !== 'object' || value === null) {
    return [];
  }
  const owner = isNode(value) ? value.type : field;
  return Object.entries(value).flatMap(([key, child]) =>
    key === 'type' || key === 'composition'
      ? []
      : stringLeaves(
          child,
          [...path, Array.isArray(value) ? Number(key) : key],
          Array.isArray(value) ? owner : `${owner}.${key}`
        )
  );
};

const withLeaf = <T>(value: T, [key, ...rest]: Path, leaf: string): T => {
  if (key === undefined) {
    return leaf as T;
  }
  const copy = (Array.isArray(value) ? [...value] : { ...value }) as Record<
    string | number,
    unknown
  >;
  copy[key] = withLeaf(copy[key], rest, leaf);
  return copy as T;
};

const accepts = (node: PrimitiveNode) =>
  runtime.validate({ type: 'view', body: [inFrame(node)] }).valid;

// A field that takes only a URL still draws it, so it gets a long one.
const prefixes = ['', 'https://example.com/'];

/** The longest word up to {@link tokenLength} the field accepts; empty when it takes none, as an enum does. */
const longestWord = (node: PrimitiveNode, path: Path): string => {
  for (const prefix of prefixes) {
    const word = (length: number) =>
      `${prefix}${'x'.repeat(length - prefix.length)}`;
    const fits = (length: number) =>
      accepts(withLeaf(node, path, word(length)));
    let [low, high] = [prefix.length, tokenLength];
    while (low < high) {
      const middle = Math.ceil((low + high) / 2);
      [low, high] = fits(middle) ? [middle, high] : [low, middle - 1];
    }
    if (low > prefix.length) {
      return word(low);
    }
  }
  return '';
};

const cases = slideDeckPrimitives.flatMap(({ examples }) =>
  examples.flatMap((example, index) => {
    const seen = new Set<string>();
    return stringLeaves(example).flatMap(({ path, field }) => {
      if (
        seen.has(field) ||
        field in skipped ||
        skippedWhen[field]?.when(example)
      ) {
        return [];
      }
      seen.add(field);
      const word = longestWord(example, path);
      return word === ''
        ? []
        : [
            {
              name: `${field} (${example.type} example ${index})`,
              node: withLeaf(example, path, word),
            },
          ];
    });
  })
);

describe('a long unbroken word', () => {
  it.each(cases)('stays inside the slide in $name', async ({ node }) => {
    expect(await textRightEdge(node)).toBeLessThanOrEqual(contentRight);
  });
});
