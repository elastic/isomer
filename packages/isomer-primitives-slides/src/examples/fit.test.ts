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
import { tallestExample as tallestHeading } from '../primitives/slide_heading/examples';
import { headingCrowding } from '../primitives/slide_heading/fit';
import { slideDeckPrimitives } from '../registry';
import { frameBodyCharacters } from '../theme/components/frame';

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
  maxItems?: number;
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

/**
 * Whether the schema lets content grow past any slide: nested body nodes, an array with no `maxItems`, or a string with no cap or a wrapped field's cap.
 * A wrapped field's cap is the whole body's capacity in the smallest type, so at its cap it overflows under any heading.
 */
const canOverflow = (
  node: JsonNode,
  defs: Record<string, JsonNode>,
  seen = new Set<string>()
): boolean => {
  const { $ref, type, maxItems, maxLength, items, properties } = node;
  if ($ref !== undefined) {
    const name = $ref.split('/').at(-1)!;
    if (name === 'bodyNode') {
      return true;
    }
    if (seen.has(name)) {
      return false;
    }
    seen.add(name);
    return canOverflow(defs[name] ?? {}, defs, seen);
  }
  if (type === 'array' && maxItems === undefined) {
    return true;
  }
  if (
    type === 'string' &&
    node.const === undefined &&
    node.enum === undefined &&
    (maxLength === undefined || maxLength >= frameBodyCharacters)
  ) {
    return true;
  }
  return [
    ...(items ? [items] : []),
    ...Object.values(properties ?? {}),
    ...(node.oneOf ?? []),
    ...(node.anyOf ?? []),
    ...(node.allOf ?? []),
  ].some((child) => canOverflow(child, defs, seen));
};

// A bounded primitive without `layoutCheckNote` adds its most content here.
const worstCases: Partial<Record<string, PrimitiveNode>> = {};

describe('a primitive whose schema allows more than the slide holds notes the layout check', () => {
  it.each(slideDeckPrimitives.map((primitive) => ({ primitive })))(
    '$primitive.type',
    async ({ primitive }) => {
      if (describesLayoutCheck(primitive)) {
        return;
      }
      const { $defs } = authoringSchema(primitive);
      expect(canOverflow($defs[primitive.type] ?? {}, $defs)).toBe(false);
      const worstCase = worstCases[primitive.type];
      expect(worstCase).toBeDefined();
      expect(await findings(previewSlide(worstCase!, tallestHeading))).toEqual(
        []
      );
    }
  );
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
