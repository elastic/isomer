/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// A drawn Scene as plain data, so one drawing binds to React DOM, to markup,
// and to native SVG components alike. Attribute names are SVG's own.

export type SvgTag =
  'svg' | 'g' | 'rect' | 'path' | 'line' | 'circle' | 'text' | 'title' | 'desc';

export type SvgAttributes = Readonly<Record<string, string | number>>;

export interface SvgElement {
  readonly tag: SvgTag;
  readonly attrs: SvgAttributes;
  readonly children: readonly SvgChild[];
}

export type SvgChild = SvgElement | string;

export type ChildInput =
  SvgChild | null | undefined | false | readonly ChildInput[];

const flatten = (input: readonly ChildInput[]): SvgChild[] =>
  input.flatMap((child): SvgChild[] => {
    if (child === null || child === undefined || child === false) {
      return [];
    }
    if (Array.isArray(child)) {
      return flatten(child as readonly ChildInput[]);
    }
    return [child as SvgChild];
  });

/** Builds an element; absent attributes and children are dropped. */
export const el = (
  tag: SvgTag,
  attrs: Readonly<Record<string, string | number | undefined>> = {},
  ...children: ChildInput[]
): SvgElement => ({
  tag,
  attrs: Object.fromEntries(
    Object.entries(attrs).filter(
      (entry): entry is [string, string | number] => entry[1] !== undefined
    )
  ),
  children: flatten(children),
});

/** `element` with `attrs` added; absent values are dropped. */
export const withAttrs = (
  element: SvgElement,
  attrs: Readonly<Record<string, string | number | undefined>>
): SvgElement =>
  el(element.tag, { ...element.attrs, ...attrs }, element.children);

const escapeText = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const escapeAttribute = (value: string) =>
  escapeText(value).replace(/"/g, '&quot;');

/** SVG markup for an element, for hosts that take a string. */
export const toSvgMarkup = (element: SvgChild): string => {
  if (typeof element === 'string') {
    return escapeText(element);
  }
  const attrs = Object.entries(element.attrs)
    .map(([name, value]) => ` ${name}="${escapeAttribute(String(value))}"`)
    .join('');
  const xmlns =
    element.tag === 'svg' ? ' xmlns="http://www.w3.org/2000/svg"' : '';
  const children = element.children.map(toSvgMarkup).join('');
  return `<${element.tag}${xmlns}${attrs}>${children}</${element.tag}>`;
};

/** Every element in the drawing, depth first. */
export const walkSvg = (element: SvgElement): SvgElement[] => [
  element,
  ...element.children.flatMap((child) =>
    typeof child === 'string' ? [] : walkSvg(child)
  ),
];

/** Every text run in the drawing, in document order. */
export const svgText = (element: SvgElement): string[] =>
  element.children.flatMap((child) =>
    typeof child === 'string' ? [child] : svgText(child)
  );
