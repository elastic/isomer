/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChildNodeWalker } from '../composition/body_node_base';

import {
  anchoredNodePaths,
  LAYOUT_ROOM_ATTRIBUTE,
  NODE_ANCHOR_ATTRIBUTE,
  nodeType,
  pairAnchors,
} from './anchors';

/** A rectangle on the canvas, in pixels. */
export interface LayoutRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

/** A laid-out element and the elements nested in it, as a layout engine measures them. */
export interface LayoutBox extends LayoutRect {
  /** Absent means unscaled. */
  readonly scale?: number;
  /** Text laid out in the box. */
  readonly runs?: readonly LayoutRect[];
  /** Where a {@link NODE_ANCHOR_ATTRIBUTE} is read from. */
  readonly attributes?: Readonly<Record<string, string>>;
  readonly children: readonly LayoutBox[];
}

/** A node drawn past the room its container gives it, or onto a sibling, by `by` pixels. */
export interface LayoutFinding {
  kind: 'overflow' | 'overlap';
  /** In validation's form, e.g. `body[1].items[0]`. */
  path: string;
  type: string;
  /** The sibling an `overlap` lands on. */
  with?: { path: string; type: string };
  by: number;
}

interface PlacedNode {
  box: LayoutBox;
  path: string;
  type: string;
}

// Sub-pixel rounding reads as overflow without it.
const tolerance = 1;

const isScaled = ({ scale = 1 }: LayoutBox): boolean =>
  Math.abs(scale - 1) > 0.001;

const hasArea = ({ width, height }: LayoutRect): boolean =>
  width > 0 && height > 0;

/** Every anchored box, pre-order, including those inside a scaled box, so a type's count matches its nodes. */
const anchoredBoxes = (box: LayoutBox): [string, LayoutBox][] => {
  const value = box.attributes?.[NODE_ANCHOR_ATTRIBUTE];
  return [
    ...(value === undefined ? [] : [[value, box] as [string, LayoutBox]]),
    ...box.children.flatMap(anchoredBoxes),
  ];
};

const roomBoxes = (box: LayoutBox): LayoutBox[] => [
  ...(box.attributes?.[LAYOUT_ROOM_ATTRIBUTE] === undefined ? [] : [box]),
  ...box.children.flatMap(roomBoxes),
];

/**
 * The element boxes a node's own content fills: its box and those under it,
 * down to the nodes nested in it. Text runs are left out because glyphs
 * overhang a tight line height; a scaled box counts as itself alone.
 */
const ownBoxes = (
  box: LayoutBox,
  nested: ReadonlySet<LayoutBox>
): LayoutBox[] => [
  box,
  ...(isScaled(box)
    ? []
    : box.children.flatMap((child) =>
        nested.has(child) ? [] : ownBoxes(child, nested)
      )),
];

/** What a box paints: its text, or itself when it holds nothing else, like a dot or a rule. */
const painted = (box: LayoutBox): LayoutRect[] => {
  if (isScaled(box)) {
    return [box];
  }
  const own =
    box.runs && box.runs.length > 0
      ? box.runs
      : box.children.length === 0
        ? [box]
        : [];
  return [...own.filter(hasArea), ...box.children.flatMap(painted)];
};

const pastRoom = (room: LayoutRect, { x, y, width, height }: LayoutRect) =>
  Math.max(
    room.x - x,
    room.y - y,
    x + width - (room.x + room.width),
    y + height - (room.y + room.height)
  );

/** How far `a` and `b` would have to move apart, along one axis, to clear each other. */
const overlapOf = (a: LayoutRect, b: LayoutRect): number => {
  const width = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
  const height = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);
  if (width <= tolerance || height <= tolerance) {
    return 0;
  }
  return Math.min(
    a.x + a.width - b.x,
    b.x + b.width - a.x,
    a.y + a.height - b.y,
    b.y + b.height - a.y
  );
};

/**
 * Where the nodes of `body` run past their room or onto each other in
 * `layout`, a measured render on `surface` with node anchors on. Empty when
 * nothing does.
 *
 * A node's room is the box of its nearest anchored or `layoutRoom` ancestor,
 * or `layout` at the top level, and only siblings under one room are
 * compared. Nothing inside a scaled box is checked. A finding is advice, not an error:
 * an overlap may be intended.
 */
export const checkLayout = (
  layout: LayoutBox,
  body: readonly unknown[],
  walk: ChildNodeWalker,
  surface: 'react' | 'svg'
): LayoutFinding[] => {
  const nodes = anchoredNodePaths(body, walk, surface);
  const anchored = anchoredBoxes(layout);
  const boxes = pairAnchors(
    anchored,
    nodes.map(({ node }) => node)
  );
  const placed = new Map<LayoutBox, PlacedNode>();
  boxes.forEach((box, index) => {
    const { node, path } = nodes[index]!;
    const type = nodeType(node);
    if (box !== undefined && type !== undefined) {
      placed.set(box, { box, path, type });
    }
  });

  // Every anchored box bounds its ancestors' content, paired or not.
  const nested = new Set(anchored.map(([, box]) => box));
  const bounding = new Set([...nested, ...roomBoxes(layout)]);
  const rooms = new Map<PlacedNode, LayoutBox>();
  const siblings = new Map<LayoutBox | undefined, PlacedNode[]>();
  const visit = (box: LayoutBox, parent: LayoutBox | undefined): void => {
    const node = placed.get(box);
    if (node !== undefined) {
      rooms.set(node, parent ?? layout);
      siblings.set(parent, [...(siblings.get(parent) ?? []), node]);
    }
    if (!isScaled(box)) {
      box.children.forEach((child) =>
        visit(child, bounding.has(box) ? box : parent)
      );
    }
  };
  visit(layout, undefined);

  const overflows = [...rooms].flatMap(([node, room]): LayoutFinding[] => {
    const by = Math.max(
      0,
      ...ownBoxes(node.box, nested)
        .filter(hasArea)
        .map((box) => pastRoom(room, box))
    );
    return by > tolerance
      ? [
          {
            kind: 'overflow',
            path: node.path,
            type: node.type,
            by: Math.round(by),
          },
        ]
      : [];
  });

  const overlaps = [...siblings.values()].flatMap((group) => {
    const paints = group.map(({ box }) => painted(box));
    return group.flatMap((first, i) =>
      group.slice(i + 1).flatMap((second, offset): LayoutFinding[] => {
        const by = Math.max(
          0,
          ...paints[i]!.flatMap((a) =>
            paints[i + 1 + offset]!.map((b) => overlapOf(a, b))
          )
        );
        return by > 0
          ? [
              {
                kind: 'overlap',
                path: first.path,
                type: first.type,
                with: { path: second.path, type: second.type },
                by: Math.round(by),
              },
            ]
          : [];
      })
    );
  });

  return [...overflows, ...overlaps];
};
