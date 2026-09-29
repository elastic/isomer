/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { afterEach, describe, expect, it } from 'vitest';

import { createChildNodeWalker } from '../composition/body_node_base';

import { NODE_ANCHOR_ATTRIBUTE } from './anchors';
import { checkLayout } from './layout_check';
import { measureDom } from './measure_dom';

type Rect = [x: number, y: number, width: number, height: number];

const toDomRect = ([x, y, width, height]: Rect) =>
  ({ x, y, width, height }) as DOMRect;

// jsdom does no layout, so each element and text node is handed its rects.
const textRects = new Map<Node, Rect[]>();
Range.prototype.getClientRects = function (this: Range) {
  return (textRects.get(this.startContainer) ?? []).map(
    toDomRect
  ) as unknown as DOMRectList;
};
afterEach(() => textRects.clear());

const laidOut = (element: Element, rect: Rect, text?: Rect[]): Element => {
  element.getBoundingClientRect = () => toDomRect(rect);
  if (text !== undefined) {
    textRects.set(element.firstChild!, text);
  }
  return element;
};

const parse = (html: string): Element => {
  const host = document.createElement('div');
  host.innerHTML = html;
  return host.firstElementChild!;
};

describe('measureDom', () => {
  it('measures from the root, with runs, attributes, and children', () => {
    const root = parse(
      '<section class="isomer" style="padding: 4px"><p id="x" class="lead" data-isomer-node="leaf" aria-label="Lead">Hello</p> <div><span>a</span></div></section>'
    );
    const [p, div] = Array.from(root.children);
    laidOut(root, [100, 50, 400, 200]);
    laidOut(p!, [110, 60, 300, 20], [[110, 62, 40, 16]]);
    laidOut(div!, [110, 90, 300, 40]);
    laidOut(div!.firstElementChild!, [110, 90, 10, 16], [[110, 90, 10, 16]]);

    expect(measureDom(root)).toEqual({
      x: 0,
      y: 0,
      width: 400,
      height: 200,
      runs: [],
      children: [
        {
          x: 10,
          y: 10,
          width: 300,
          height: 20,
          runs: [{ x: 10, y: 12, width: 40, height: 16 }],
          attributes: { 'data-isomer-node': 'leaf', 'aria-label': 'Lead' },
          children: [],
        },
        {
          x: 10,
          y: 40,
          width: 300,
          height: 40,
          runs: [],
          children: [
            {
              x: 10,
              y: 40,
              width: 10,
              height: 16,
              runs: [{ x: 10, y: 40, width: 10, height: 16 }],
              children: [],
            },
          ],
        },
      ],
    });
  });

  it('scales a box drawn at another size than it was laid out at', () => {
    const root = parse(
      '<div><div></div><div></div><div></div><div></div></div>'
    );
    const [wide, rounded, tall, both] = Array.from(root.children);
    laidOut(root, [0, 0, 400, 200]);
    laidOut(wide!, [0, 0, 50, 20]);
    laidOut(rounded!, [0, 20, 100.4, 20]);
    laidOut(tall!, [0, 40, 100, 10]);
    laidOut(both!, [0, 60, 110, 10]);
    for (const element of [wide!, rounded!, tall!, both!]) {
      Object.defineProperties(element, {
        offsetWidth: { value: 100 },
        offsetHeight: { value: 20 },
      });
    }

    const [first, second, third, fourth] = measureDom(root).children;
    expect(first?.scale).toBe(0.5);
    expect(second).not.toHaveProperty('scale');
    expect(third?.scale).toBe(0.5);
    // Width scales by 1.1 and height by 0.5; the one further from 1 wins.
    expect(fourth?.scale).toBe(0.5);
  });

  it('never scales an SVG element, which has no layout size', () => {
    const root = parse(
      '<div><svg width="100" height="20"><rect width="100" height="20"></rect></svg></div>'
    );
    const svg = root.firstElementChild!;
    laidOut(root, [0, 0, 400, 200]);
    laidOut(svg, [0, 0, 20, 100]);
    laidOut(svg.firstElementChild!, [0, 0, 20, 100]);

    const [box] = measureDom(root).children;
    expect(box).not.toHaveProperty('scale');
    expect(box?.children[0]).not.toHaveProperty('scale');
  });

  it('keeps an attribute whose name is an Object.prototype key', () => {
    const root = parse('<div data-a="1"></div>');
    root.setAttribute('__proto__', 'kept');
    laidOut(root, [0, 0, 10, 10]);

    const { attributes } = measureDom(root);
    expect(Object.getOwnPropertyNames(attributes)).toEqual([
      'data-a',
      '__proto__',
    ]);
    expect(Object.getPrototypeOf(attributes)).toBe(Object.prototype);
  });

  it('feeds checkLayout a browser render of anchored nodes', () => {
    const root = parse(
      `<div><p ${NODE_ANCHOR_ATTRIBUTE}="leaf">one</p><p ${NODE_ANCHOR_ATTRIBUTE}="leaf">two</p></div>`
    );
    const [first, second] = Array.from(root.children);
    laidOut(root, [0, 0, 200, 100]);
    laidOut(first!, [0, 0, 200, 20], [[0, 0, 30, 20]]);
    laidOut(second!, [150, 20, 100, 20], [[150, 20, 30, 20]]);
    const leaf = { type: 'leaf' };

    expect(
      checkLayout(
        measureDom(root),
        [leaf, leaf],
        createChildNodeWalker([]),
        'react'
      )
    ).toEqual([{ kind: 'overflow', path: 'body[1]', type: 'leaf', by: 50 }]);
  });
});
