/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LayoutBox, LayoutRect } from './layout_check';

const TEXT_NODE = 3;

const unlisted = new Set(['class', 'id', 'style']);

/** Drawn size over layout size, within a pixel of `offsetWidth`'s rounding. */
const axisScale = (drawn: number, laid: number): number =>
  laid > 0 && Math.abs(drawn - laid) > 1 ? drawn / laid : 1;

const scaleOf = (
  element: Element,
  { width, height }: DOMRectReadOnly
): number => {
  if (!('offsetWidth' in element)) {
    return 1;
  }
  const { offsetWidth, offsetHeight } = element as HTMLElement;
  const scaleX = axisScale(width, offsetWidth);
  const scaleY = axisScale(height, offsetHeight);
  return Math.abs(scaleY - 1) > Math.abs(scaleX - 1) ? scaleY : scaleX;
};

/**
 * The {@link LayoutBox} tree a browser laid `root` out as, measured from
 * `root`'s top left, for {@link checkLayout}. A box's `scale` is its drawn
 * size over its layout size, so a rotated box reads as scaled. jsdom does no
 * layout, so every box it measures is empty.
 */
export const measureDom = (root: Element): LayoutBox => {
  const origin = root.getBoundingClientRect();
  const range = root.ownerDocument.createRange();
  const place = ({ x, y, width, height }: DOMRectReadOnly): LayoutRect => ({
    x: x - origin.x,
    y: y - origin.y,
    width,
    height,
  });

  const measure = (element: Element): LayoutBox => {
    const rect = element.getBoundingClientRect();
    const scale = scaleOf(element, rect);
    const attributes: Record<string, string> = {};
    for (const { name, value } of Array.from(element.attributes)) {
      if (!unlisted.has(name)) {
        attributes[name] = value;
      }
    }
    return {
      ...place(rect),
      ...(scale !== 1 && { scale }),
      runs: Array.from(element.childNodes)
        .filter(
          (node) => node.nodeType === TEXT_NODE && node.textContent?.trim()
        )
        .flatMap((node) => {
          range.selectNodeContents(node);
          return Array.from(range.getClientRects(), place);
        }),
      ...(Object.keys(attributes).length > 0 && { attributes }),
      children: Array.from(element.children, measure),
    };
  };

  return measure(root);
};
