/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Hosts insert an icon's `svg` as markup, so every rule here is an allowlist.

import { iconsByType, type PrimitivePack } from '../pack/primitive_pack';

// HTML's markup whitespace, never `\s`: a parser reads NBSP and other Unicode separators as part of a name or as text.
const NUMBER = /^[-+0-9.eE,\t\n\f\r ]*$/;
const PATH_DATA = /^[-+0-9.eE,\t\n\f\r MmLlHhVvCcSsQqTtAaZz]*$/;
const TRANSFORM =
  /^(?:[\t\n\f\r ]*(?:matrix|translate|scale|rotate|skewX|skewY)[\t\n\f\r ]*\([-+0-9.eE,\t\n\f\r ]*\)[\t\n\f\r ]*,?)*[\t\n\f\r ]*$/;
const PAINT =
  /^(?:none|currentColor|var\(--isomer-icon-(?:accent|bg|fg|muted)(?:[\t\n\f\r ]*,[\t\n\f\r ]*(?:currentColor|#[0-9a-fA-F]{3}|#[0-9a-fA-F]{6}))?\))$/;
const PAINT_RULE = 'is not none, currentColor, or var(--isomer-icon-*)';

const NAME = /[A-Za-z][\w:.-]*/y;
const ATTRIBUTE_NAME = /[^\t\n\f\r "'<>/=]+/y;
const WHITESPACE = /[\t\n\f\r ]*/y;
const BLANK = /^[\t\n\f\r ]*$/;
const NAME_END = /[\t\n\f\r />]/;

const trimMarkup = (text: string): string =>
  text.replace(/^[\t\n\f\r ]+|[\t\n\f\r ]+$/g, '');

const isNumber = (value: string): boolean => NUMBER.test(value);

const keyword =
  (...words: string[]) =>
  (value: string): boolean =>
    words.includes(value);

const ATTRIBUTE_RULES: ReadonlyMap<string, (value: string) => boolean> =
  new Map([
    ['clip-rule', keyword('nonzero', 'evenodd')],
    ['cx', isNumber],
    ['cy', isNumber],
    ['d', (value) => PATH_DATA.test(value)],
    ['fill', (value) => PAINT.test(value)],
    ['fill-opacity', isNumber],
    ['fill-rule', keyword('nonzero', 'evenodd')],
    ['height', isNumber],
    ['opacity', isNumber],
    ['points', isNumber],
    ['r', isNumber],
    ['rx', isNumber],
    ['ry', isNumber],
    ['stroke', (value) => PAINT.test(value)],
    ['stroke-linecap', keyword('butt', 'round', 'square')],
    ['stroke-linejoin', keyword('miter', 'round', 'bevel')],
    ['stroke-opacity', isNumber],
    ['stroke-width', isNumber],
    ['transform', (value) => TRANSFORM.test(value)],
    ['viewBox', keyword('0 0 16 16')],
    ['width', isNumber],
    ['x', isNumber],
    ['x1', isNumber],
    ['x2', isNumber],
    ['xmlns', keyword('http://www.w3.org/2000/svg')],
    ['y', isNumber],
    ['y1', isNumber],
    ['y2', isNumber],
  ]);

const PRESENTATION = [
  'clip-rule',
  'fill',
  'fill-opacity',
  'fill-rule',
  'opacity',
  'stroke',
  'stroke-linecap',
  'stroke-linejoin',
  'stroke-opacity',
  'stroke-width',
  'transform',
];

const ELEMENT_ATTRIBUTES: ReadonlyMap<string, ReadonlySet<string>> = new Map([
  ['svg', new Set(['viewBox', 'xmlns', ...PRESENTATION])],
  ['g', new Set(PRESENTATION)],
  ['path', new Set(['d', ...PRESENTATION])],
  ['rect', new Set(['x', 'y', 'width', 'height', 'rx', 'ry', ...PRESENTATION])],
  ['circle', new Set(['cx', 'cy', 'r', ...PRESENTATION])],
  ['ellipse', new Set(['cx', 'cy', 'rx', 'ry', ...PRESENTATION])],
  ['line', new Set(['x1', 'y1', 'x2', 'y2', ...PRESENTATION])],
  ['polyline', new Set(['points', ...PRESENTATION])],
  ['polygon', new Set(['points', ...PRESENTATION])],
]);

/** Every way `svg` breaks the icon rules, as one line each; empty when it passes. */
const iconProblems = (svg: string): string[] => {
  const problems: string[] = [];
  const open: string[] = [];
  let roots = 0;
  let index = 0;

  const match = (pattern: RegExp): string => {
    pattern.lastIndex = index;
    const found = pattern.exec(svg)?.[0] ?? '';
    index += found.length;
    return found;
  };

  const checkAttributes = (
    element: string,
    attributes: ReadonlyMap<string, string>
  ): void => {
    const allowed = ELEMENT_ATTRIBUTES.get(element);
    if (!allowed) {
      problems.push(`<${element}> is not an allowed element`);
      return;
    }
    for (const [name, value] of attributes) {
      if (!allowed.has(name)) {
        problems.push(`${name} is not an allowed attribute on <${element}>`);
      } else if (value.includes('&')) {
        problems.push(`${name}="${value}" contains an entity`);
      } else if (!ATTRIBUTE_RULES.get(name)!(value)) {
        problems.push(
          name === 'fill' || name === 'stroke'
            ? `${name}="${value}" ${PAINT_RULE}`
            : `${name}="${value}" is not an allowed value`
        );
      }
    }
  };

  while (index < svg.length) {
    if (svg[index] !== '<') {
      const end = svg.indexOf('<', index);
      const text = svg.slice(index, end === -1 ? undefined : end);
      if (!BLANK.test(text)) {
        problems.push(
          open.length > 0
            ? `text content "${trimMarkup(text)}" is not allowed`
            : `unexpected "${trimMarkup(text)}" outside <svg>`
        );
        return problems;
      }
      index += text.length;
      continue;
    }

    if (svg.startsWith('<!', index) || svg.startsWith('<?', index)) {
      problems.push('comments, declarations, and CDATA are not allowed');
      return problems;
    }

    if (svg.startsWith('</', index)) {
      index += 2;
      const name = match(NAME);
      match(WHITESPACE);
      if (name === '' || svg[index] !== '>') {
        problems.push('malformed closing tag');
        return problems;
      }
      index += 1;
      const expected = open.pop();
      if (expected === undefined) {
        problems.push(`</${name}> closes nothing`);
        return problems;
      }
      if (expected !== name) {
        problems.push(`</${name}> does not close <${expected}>`);
        return problems;
      }
      continue;
    }

    index += 1;
    const element = match(NAME);
    if (element === '' || !NAME_END.test(svg[index] ?? '>')) {
      problems.push('malformed opening tag');
      return problems;
    }
    if (open.length === 0) {
      roots += 1;
      if (roots > 1) {
        problems.push('more than one root element');
        return problems;
      }
      if (element !== 'svg') {
        problems.push(`root is <${element}>, not <svg>`);
        return problems;
      }
    }

    const attributes = new Map<string, string>();
    let selfClosing = false;
    for (;;) {
      match(WHITESPACE);
      if (svg.startsWith('/>', index)) {
        index += 2;
        selfClosing = true;
        break;
      }
      if (svg[index] === '>') {
        index += 1;
        break;
      }
      const name = match(ATTRIBUTE_NAME);
      if (name === '') {
        problems.push(`<${element}> is not terminated`);
        return problems;
      }
      match(WHITESPACE);
      if (svg[index] !== '=') {
        problems.push(`${name} on <${element}> has no value`);
        return problems;
      }
      index += 1;
      match(WHITESPACE);
      const quote = svg[index];
      if (quote !== '"' && quote !== "'") {
        problems.push(`${name} on <${element}> is unquoted`);
        return problems;
      }
      const close = svg.indexOf(quote, index + 1);
      if (close === -1) {
        problems.push(`${name} on <${element}> is unterminated`);
        return problems;
      }
      const value = svg.slice(index + 1, close);
      index = close + 1;
      if (value.includes('<')) {
        problems.push(`${name} on <${element}> contains "<"`);
        return problems;
      }
      if (attributes.has(name)) {
        problems.push(`<${element}> repeats ${name}`);
        return problems;
      }
      attributes.set(name, value);
    }

    checkAttributes(element, attributes);
    if (open.length === 0 && !attributes.has('viewBox')) {
      problems.push('<svg> has no viewBox="0 0 16 16"');
    }
    if (!selfClosing) {
      open.push(element);
    } else if (open.length === 0) {
      problems.push('<svg> is empty');
    }
  }

  if (roots === 0) {
    problems.push('has no <svg> root');
  }
  for (const element of open.reverse()) {
    problems.push(`<${element}> is not closed`);
  }
  return problems;
};

/**
 * Fails when any icon in `pack` breaks the rules a host relies on to inline it: a single `<svg viewBox="0 0 16 16">` root, allowlisted shape elements and geometry or paint attributes, and paint limited to `none`, `currentColor`, or `var(--isomer-icon-*)` with an optional `currentColor` or hex fallback.
 *
 * @example
 * ```ts
 * assertPackIconsValid(slidesPack);
 * ```
 */
export const assertPackIconsValid = ({
  icons,
  primitives,
}: Pick<PrimitivePack, 'icons' | 'primitives'>): void => {
  const byType = icons ?? iconsByType(primitives);
  const problems = Object.keys(byType).flatMap((type) =>
    iconProblems(byType[type]!.svg).map((problem) => `${type} icon: ${problem}`)
  );
  if (problems.length > 0) {
    throw new Error(
      `Pack icons break the icon rules:\n${problems.map((line) => `- ${line}`).join('\n')}`
    );
  }
};
