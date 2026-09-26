/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** A laid-out box on the canvas, as an image backend measures it; the takumi backend's `LayoutBox` fits. */
export interface SlideLayoutBox {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Absent means unscaled. */
  scale?: number;
  /** Text laid out in the box. */
  runs?: readonly Rect[];
  children: readonly SlideLayoutBox[];
}

interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Two of a frame body's nodes, by index, drawn over each other by `by` pixels. */
export interface SlideOverlap {
  nodes: [number, number];
  by: number;
}

/** How far a slide's content runs past its frame body on each side, in pixels. */
export interface SlideOverflow {
  top: number;
  right: number;
  bottom: number;
  left: number;
  /** The frame body's nodes, by index, whose content runs past it. */
  nodes: number[];
}

// Sub-pixel rounding reads as overflow without it.
const tolerance = 1;

const isScaled = ({ scale = 1 }: SlideLayoutBox): boolean =>
  Math.abs(scale - 1) > 0.001;

// Element boxes only: a text run is its glyphs, which overhang a tight line height.
// A scaled box is a picture of another render, clipped by its panel, so its content is not searched.
const boxesIn = (box: SlideLayoutBox): SlideLayoutBox[] =>
  box.children.flatMap((child) =>
    isScaled(child) ? [child] : [child, ...boxesIn(child)]
  );

/**
 * How far a measured slide's content runs past its frame body, or `undefined`
 * when it fits. `slide` is the whole slide as the `svg` surface lays it out:
 * the deck root, then the slide, then its body.
 */
export const slideOverflow = (
  slide: SlideLayoutBox
): SlideOverflow | undefined => {
  const body = slide.children[0]?.children[0];
  if (body === undefined) {
    return undefined;
  }
  const past = { top: 0, right: 0, bottom: 0, left: 0 };
  const nodes: number[] = [];
  body.children.forEach((node, index) => {
    const own = { top: 0, right: 0, bottom: 0, left: 0 };
    const boxes = isScaled(node) ? [node] : [node, ...boxesIn(node)];
    for (const { x, y, width, height } of boxes) {
      if (width <= 0 || height <= 0) {
        continue;
      }
      own.top = Math.max(own.top, body.y - y);
      own.left = Math.max(own.left, body.x - x);
      own.bottom = Math.max(own.bottom, y + height - (body.y + body.height));
      own.right = Math.max(own.right, x + width - (body.x + body.width));
    }
    if (Object.values(own).some((value) => value > tolerance)) {
      nodes.push(index);
    }
    for (const side of ['top', 'right', 'bottom', 'left'] as const) {
      past[side] = Math.max(past[side], own[side]);
    }
  });
  return nodes.length > 0
    ? {
        top: Math.round(past.top),
        right: Math.round(past.right),
        bottom: Math.round(past.bottom),
        left: Math.round(past.left),
        nodes,
      }
    : undefined;
};

/** What a box paints: its text, or itself when it holds nothing else, like a dot or a rule. */
const painted = (box: SlideLayoutBox): Rect[] => {
  if (isScaled(box)) {
    return [box];
  }
  const own =
    box.runs && box.runs.length > 0
      ? box.runs
      : box.children.length === 0
        ? [box]
        : [];
  return [
    ...own.filter(({ width, height }) => width > 0 && height > 0),
    ...box.children.flatMap(painted),
  ];
};

/** How far `a` and `b` overlap vertically, when they share more than a sliver. */
const overlapOf = (a: Rect, b: Rect): number => {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  return width > tolerance && height > tolerance ? height : 0;
};

/**
 * The frame body's nodes whose painted content lands on another's, as when a
 * squeezed node's text runs into the node below it. Empty when none do.
 */
export const slideOverlaps = (slide: SlideLayoutBox): SlideOverlap[] => {
  const nodes = (slide.children[0]?.children[0]?.children ?? []).map(painted);
  return nodes.flatMap((first, i) =>
    nodes.slice(i + 1).flatMap((second, offset): SlideOverlap[] => {
      const by = Math.max(
        0,
        ...first.flatMap((a) => second.map((b) => overlapOf(a, b)))
      );
      return by > 0 ? [{ nodes: [i, i + 1 + offset], by: Math.round(by) }] : [];
    })
  );
};
