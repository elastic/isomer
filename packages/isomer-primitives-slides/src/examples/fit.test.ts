/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  createTakumiImageBackend,
  type LayoutBox,
} from '@elastic/isomer-image-takumi';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import {
  buildAuthoringJsonSchema,
  checkLayout,
  type Composition,
  createChildNodeWalker,
  NODE_ANCHOR_ATTRIBUTE,
  type PrimitiveNode,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../pack';
import { slidesPackAuthoring } from '../pack_authoring';
import { layoutCheckNote } from '../primitives/authored_text';
import type { SlideCodeNode } from '../primitives/slide_code/schema';
import { tallestExample as tallestHeading } from '../primitives/slide_heading/examples';
import { headingCrowding } from '../primitives/slide_heading/fit';
import { slideDeckPrimitives } from '../registry';
import { codeLineMaxLength } from '../theme/components/code';
import { frameLineCharacters } from '../theme/components/frame';

import { slideFonts } from './fonts';
import { previewSlide } from './preview_slide';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});
const takumi = createTakumiImageBackend({ fonts: slideFonts });
const walk = createChildNodeWalker(runtime.primitives);

// Sub-pixel rounding reads as overflow without it.
const tolerance = 1;

const cases = slideDeckPrimitives.flatMap(({ type, examples }) =>
  examples.map((example, index) => ({
    name: `${type} #${index}`,
    slide: previewSlide(example as PrimitiveNode),
  }))
);

const descendants = (box: LayoutBox): LayoutBox[] =>
  box.children.flatMap((child) => [child, ...descendants(child)]);

// `checkLayout` bounds a top-level node by the frame's whole canvas, so this also holds it to the frame's body, above the footer.
const pastBody = (layout: LayoutBox): LayoutBox[] => {
  const frame = [layout, ...descendants(layout)].find(
    ({ attributes }) => attributes?.[NODE_ANCHOR_ATTRIBUTE] === 'slideFrame'
  );
  const body = frame?.children[0]?.children[0];
  if (body === undefined) {
    throw new Error('no frame body in the measured layout');
  }
  return descendants(body).filter(
    ({ x, y, width, height }) =>
      width > 0 &&
      height > 0 &&
      (x < body.x - tolerance ||
        y < body.y - tolerance ||
        x + width > body.x + body.width + tolerance ||
        y + height > body.y + body.height + tolerance)
  );
};

const findings = async (slide: Composition) => {
  const layout = await takumi.measure(
    runtime.surfaces.svg.render(slide, { anchors: true })
  );
  return [...checkLayout(layout, slide.body, walk, 'svg'), ...pastBody(layout)];
};

describe('every example fits its preview slide', () => {
  it.each(cases)('$name', async ({ slide }) => {
    expect(await findings(slide)).toEqual([]);
  });
});

type SlidePrimitive = (typeof slideDeckPrimitives)[number];

interface JsonNode {
  $ref?: string;
  type?: string;
  const?: unknown;
  enum?: unknown[];
  description?: string;
  required?: string[];
  minItems?: number;
  maxItems?: number;
  minLength?: number;
  maxLength?: number;
  items?: JsonNode;
  properties?: Record<string, JsonNode>;
  oneOf?: JsonNode[];
  anyOf?: JsonNode[];
  allOf?: JsonNode[];
}

const authoringSchema = (primitive: SlidePrimitive) =>
  buildAuthoringJsonSchema([primitive], slidesPackAuthoring) as {
    $defs: Record<string, JsonNode>;
  };

const describesLayoutCheck = (primitive: SlidePrimitive) =>
  JSON.stringify(authoringSchema(primitive)).includes(layoutCheckNote);

const refName = ($ref: string) => $ref.split('/').at(-1)!;

type Defs = Record<string, JsonNode>;

// A path segment is a property name, or `[]` for an array's items.
type SchemaPath = readonly string[];

// `W` is the widest glyph the image draws.
const widest = 'W';

const resolve = (node: JsonNode, defs: Defs): JsonNode =>
  node.$ref !== undefined && refName(node.$ref) !== 'bodyNode'
    ? resolve(defs[refName(node.$ref)] ?? {}, defs)
    : node;

const isBodyNode = ({ $ref }: JsonNode) =>
  $ref !== undefined && refName($ref) === 'bodyNode';

const isFreeString = (node: JsonNode) =>
  node.type === 'string' && node.const === undefined && node.enum === undefined;

/** Every field under `node`, by path, with the nodes along the way. */
const fieldsOf = (
  node: JsonNode,
  defs: Defs,
  trail: JsonNode[] = [node],
  path: SchemaPath = []
): Array<{ path: SchemaPath; trail: JsonNode[] }> => {
  const own = resolve(node, defs);
  const children: Array<[string, JsonNode]> = [
    ...Object.entries(own.properties ?? {}),
    ...(own.type === 'array' && own.items
      ? [['[]', own.items] as [string, JsonNode]]
      : []),
  ];
  return [
    ...(path.length > 0 ? [{ path, trail }] : []),
    ...(isBodyNode(own)
      ? []
      : children.flatMap(([key, child]) =>
          fieldsOf(
            child,
            defs,
            [...trail, child, resolve(child, defs)],
            [...path, key]
          )
        )),
  ];
};

/** Nested slide nodes, an array with no `maxItems`, or a string with no `maxLength`: no most content to measure. */
const isUnbounded = (node: JsonNode) =>
  isBodyNode(node) ||
  (node.type === 'array' && node.maxItems === undefined) ||
  (isFreeString(node) && node.maxLength === undefined);

const isCapped = (node: JsonNode) =>
  (node.type === 'array' && node.maxItems !== undefined) ||
  (isFreeString(node) && node.maxLength !== undefined);

const oneBullet = { type: 'slideBulletList', items: [widest] };

/** The least a schema takes: required fields only, each string one glyph, each array at its minimum. */
const leastContent = (node: JsonNode, defs: Defs): unknown => {
  if (isBodyNode(node)) {
    return oneBullet;
  }
  const own = resolve(node, defs);
  const { type, items, properties } = own;
  if (own.const !== undefined) {
    return own.const;
  }
  if (own.enum !== undefined) {
    return own.enum[0];
  }
  const [variant] = own.oneOf ?? own.anyOf ?? own.allOf ?? [];
  if (variant !== undefined) {
    return leastContent(variant, defs);
  }
  if (type === 'string') {
    return widest.repeat(Math.max(1, own.minLength ?? 1));
  }
  if (type === 'array') {
    return Array.from({ length: own.minItems ?? 0 }, () =>
      leastContent(items ?? {}, defs)
    );
  }
  if (type === 'object') {
    return Object.fromEntries(
      Object.entries(properties ?? {})
        .filter(([key]) => own.required?.includes(key))
        .map(([key, child]) => [key, leastContent(child, defs)])
    );
  }
  return 1;
};

/** {@link leastContent}, with the field at `path` at its cap. */
const oneFieldAtCap = (
  node: JsonNode,
  defs: Defs,
  path: SchemaPath
): unknown => {
  const own = resolve(node, defs);
  const [head, ...rest] = path;
  if (head === undefined) {
    return own.type === 'array'
      ? Array.from({ length: own.maxItems ?? 1 }, () =>
          leastContent(own.items ?? {}, defs)
        )
      : widest.repeat(own.maxLength ?? 1);
  }
  if (head === '[]') {
    const least = leastContent(own, defs) as unknown[];
    return [oneFieldAtCap(own.items ?? {}, defs, rest), ...least.slice(1)];
  }
  return {
    ...(leastContent(own, defs) as object),
    [head]: oneFieldAtCap(own.properties?.[head] ?? {}, defs, rest),
  };
};

/**
 * Fields a schema-built value would fail (a cross-field cap, a URL format), by `type` and path, written out at their cap.
 * `null` marks a field that adds no height of its own.
 */
const worstCases: Partial<Record<string, PrimitiveNode | null>> = {
  'slideCode panels.[].lines.[]': {
    type: 'slideCode',
    panels: [{ lines: [widest.repeat(codeLineMaxLength(1, false))] }],
  } satisfies SlideCodeNode as PrimitiveNode,
  // Highlights only mark lines, so `lines` measures the height.
  'slideCode panels.[].highlightLines': null,
  'slideFrame url': {
    type: 'slideFrame',
    url: `https://example.com/${widest.repeat(frameLineCharacters - 20)}`,
    body: [oneBullet],
  } as PrimitiveNode,
};

const notes = (trail: JsonNode[]) =>
  trail.some(({ description }) => description?.includes(layoutCheckNote));

// #43: every field that can run past the slide under the tallest heading carries the note on itself or a field that holds it.
describe('the layout-check note sits on each field that can overflow', () => {
  it.each(
    slideDeckPrimitives.flatMap((primitive) => {
      const { $defs } = authoringSchema(primitive);
      const root = $defs[primitive.type] ?? {};
      return fieldsOf(root, $defs)
        .filter(({ trail }) => {
          const field = trail.at(-1)!;
          return isUnbounded(field) || isCapped(field);
        })
        .map(({ path, trail }) => ({
          name: `${primitive.type} ${path.join('.')}`,
          root,
          $defs,
          path,
          trail,
        }));
    })
  )('$name', async ({ name, root, $defs, path, trail }) => {
    if (isUnbounded(trail.at(-1)!)) {
      expect(notes(trail)).toBe(true);
      return;
    }
    const override = worstCases[name];
    if (override === null) {
      return;
    }
    const node = (override ??
      oneFieldAtCap(root, $defs, path)) as PrimitiveNode;
    const slide = previewSlide(node, tallestHeading);
    expect(runtime.validate(slide).errors).toEqual([]);
    if ((await findings(slide)).length > 0) {
      expect(notes(trail)).toBe(true);
    }
  });
});

// A primitive whose most content can overflow the tallest heading says so in its schema, so an author knows to run the check.
describe('under the tallest heading, every example fits or its schema notes the layout check', () => {
  // Crowding is 1 exactly for the two-line title and lede that load budgets are set against.
  it('measures under the heading load budgets are set against', () => {
    expect(headingCrowding(tallestHeading)).toBe(1);
  });

  it.each(
    slideDeckPrimitives.flatMap((primitive) =>
      primitive.examples.map((example, index) => ({
        name: `${primitive.type} #${index}`,
        primitive,
        slide: previewSlide(example as PrimitiveNode, tallestHeading),
      }))
    )
  )('$name', async ({ primitive, slide }) => {
    const found = await findings(slide);
    if (found.length > 0) {
      expect(describesLayoutCheck(primitive)).toBe(true);
    }
  });
});
