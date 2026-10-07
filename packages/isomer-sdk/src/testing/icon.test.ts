/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type DefaultTreeAdapterMap, html, parseFragment } from 'parse5';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { definePrimitive } from '../define/primitive_module';

import { assertPackIconsValid } from './icon';

const check = (svg: string) => () =>
  assertPackIconsValid({ primitives: [], icons: { slideStat: { svg } } });

const passes = (svg: string): boolean => {
  try {
    check(svg)();
    return true;
  } catch {
    return false;
  }
};

/** What an HTML parser builds from `svg`, as host-side inlining would see it; blank text is dropped. */
const parsedTree = (svg: string): string => {
  const render = (node: DefaultTreeAdapterMap['childNode']): string => {
    if (!('tagName' in node)) {
      return 'value' in node && /^[\t\n\f\r ]*$/.test(node.value)
        ? ''
        : node.nodeName;
    }
    const { tagName, namespaceURI, attrs, childNodes } = node;
    const attributes = attrs.map(({ name, value }) => ` ${name}="${value}"`);
    const prefix = namespaceURI === html.NS.SVG ? '' : 'html:';
    return `<${prefix}${tagName}${attributes.join('')}>${childNodes.map(render).join('')}</>`;
  };
  return parseFragment(svg).childNodes.map(render).join('');
};

const wrap = (body: string, root = 'viewBox="0 0 16 16"') =>
  `<svg ${root}>${body}</svg>`;

describe('assertPackIconsValid', () => {
  it.each([
    [
      'the issue example',
      `<svg viewBox="0 0 16 16" fill="none">
  <rect x="3" y="3" width="3" height="10" rx=".5" fill="var(--isomer-icon-accent, currentColor)"/>
  <rect x="8" y="7" width="3" height="6" rx=".5" fill="var(--isomer-icon-muted, currentColor)"/>
</svg>`,
    ],
    [
      'bare variables',
      wrap('<path d="M2 8h12" stroke="var(--isomer-icon-fg)"/>'),
    ],
    [
      'the bg slot',
      wrap(
        '<rect width="16" height="16" rx="3" fill="var(--isomer-icon-bg, #fef5d6)"/>'
      ),
    ],
    [
      'a three-digit hex fallback',
      wrap(
        '<circle cx="8" cy="8" r="3" fill="var(--isomer-icon-accent, #3a7)"/>'
      ),
    ],
    [
      'xmlns, a group, and a transform',
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"><g transform="translate(1 1) rotate(45)"><line x1="2" y1="2" x2="14" y2="14" stroke="currentColor" stroke-linecap="round"/></g></svg>`,
    ],
  ])('accepts %s', (_name, svg) => {
    expect(check(svg)).not.toThrow();
  });

  it('passes a pack with no icons', () => {
    expect(() =>
      assertPackIconsValid({ primitives: [], icons: {} })
    ).not.toThrow();
  });

  it('reads icons from definitions when the pack has no icons map', () => {
    const primitive = definePrimitive({
      type: 'probe',
      catalog: {
        type: 'probe',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'probe' },
      },
      examples: [{ type: 'probe' }],
      schema: z.object({ type: z.literal('probe') }),
      renderers: { react: () => null, text: () => '', markdown: () => [] },
      icon: { svg: wrap('<text/>') },
    });
    expect(() => assertPackIconsValid({ primitives: [primitive] })).toThrow(
      'probe icon: <text> is not an allowed element'
    );
  });

  it.each([
    ['multiple roots', `${wrap('')}${wrap('')}`, 'more than one root element'],
    ['a mismatched tag', wrap('<g></path>'), '</path> does not close <g>'],
    ['an unclosed group', wrap('<g>'), '</svg> does not close <g>'],
    ['a truncated group', '<svg viewBox="0 0 16 16"><g>', '<g> is not closed'],
    ['an unclosed root', '<svg viewBox="0 0 16 16">', '<svg> is not closed'],
    ['a stray closing tag', `${wrap('')}</g>`, '</g> closes nothing'],
    ['a duplicate attribute', wrap('<rect x="1" x="2"/>'), '<rect> repeats x'],
    [
      'an unterminated value',
      wrap('<rect x="1/>'),
      'x on <rect> is unterminated',
    ],
    ['an unquoted value', wrap('<rect x=1/>'), 'x on <rect> is unquoted'],
    [
      'a numeric entity',
      wrap('<path d="M2 8&#106;"/>'),
      'd="M2 8&#106;" contains an entity',
    ],
    [
      'a named entity',
      wrap('<path d="M2 8&amp;"/>'),
      'd="M2 8&amp;" contains an entity',
    ],
    [
      'an XML declaration',
      `<?xml version="1.0"?>${wrap('')}`,
      'comments, declarations, and CDATA are not allowed',
    ],
    [
      'a doctype',
      `<!DOCTYPE svg>${wrap('')}`,
      'comments, declarations, and CDATA are not allowed',
    ],
    [
      'a comment',
      wrap('<!-- hi -->'),
      'comments, declarations, and CDATA are not allowed',
    ],
    [
      'CDATA',
      wrap('<![CDATA[x]]>'),
      'comments, declarations, and CDATA are not allowed',
    ],
    ['trailing garbage', `${wrap('')}oops`, 'unexpected "oops" outside <svg>'],
    ['a stray >', `${wrap('')}>`, 'unexpected ">" outside <svg>'],
    ['text content', wrap('hello'), 'text content "hello" is not allowed'],
    ['no root', '', 'has no <svg> root'],
  ])('rejects %s', (_name, svg, problem) => {
    expect(check(svg)).toThrow(`slideStat icon: ${problem}`);
  });

  it.each([
    [
      'a hard-coded colour',
      wrap('<rect fill="#f00"/>'),
      `fill="#f00" is not none, currentColor, or var(--isomer-icon-*)`,
    ],
    [
      'a four-digit hex fallback',
      wrap('<rect fill="var(--isomer-icon-accent, #ff00)"/>'),
      'fill="var(--isomer-icon-accent, #ff00)" is not none',
    ],
    [
      'a named-colour fallback',
      wrap('<rect stroke="var(--isomer-icon-fg, red)"/>'),
      'stroke="var(--isomer-icon-fg, red)" is not none',
    ],
    [
      'rgb()',
      wrap('<rect fill="rgb(0, 0, 0)"/>'),
      'fill="rgb(0, 0, 0)" is not none',
    ],
    [
      'url()',
      wrap('<rect fill="url(#gradient)"/>'),
      'fill="url(#gradient)" is not none',
    ],
    [
      'another variable',
      wrap('<rect fill="var(--euiColorPrimary)"/>'),
      'fill="var(--euiColorPrimary)" is not none',
    ],
    ['<text>', wrap('<text>x</text>'), '<text> is not an allowed element'],
    [
      '<script>',
      wrap('<script></script>'),
      '<script> is not an allowed element',
    ],
    ['<use>', wrap('<use/>'), '<use> is not an allowed element'],
    [
      'href',
      wrap('<path href="#a"/>'),
      'href is not an allowed attribute on <path>',
    ],
    [
      'xlink:href',
      wrap('<path xlink:href="#a"/>'),
      'xlink:href is not an allowed attribute on <path>',
    ],
    [
      'style',
      wrap('<rect style="fill:red"/>'),
      'style is not an allowed attribute on <rect>',
    ],
    [
      'class',
      wrap('<rect class="a"/>'),
      'class is not an allowed attribute on <rect>',
    ],
    [
      'an event handler',
      wrap('<rect onclick="alert(1)"/>'),
      'onclick is not an allowed attribute on <rect>',
    ],
    [
      'url() in a transform',
      wrap('<g transform="url(#a)"></g>'),
      'transform="url(#a)" is not an allowed value',
    ],
    [
      'the wrong viewBox',
      wrap('', 'viewBox="0 0 24 24"'),
      'viewBox="0 0 24 24" is not an allowed value',
    ],
    ['no viewBox', '<svg></svg>', '<svg> has no viewBox="0 0 16 16"'],
    [
      'width on the root',
      wrap('', 'viewBox="0 0 16 16" width="16"'),
      'width is not an allowed attribute on <svg>',
    ],
    [
      'height on the root',
      wrap('', 'viewBox="0 0 16 16" height="16"'),
      'height is not an allowed attribute on <svg>',
    ],
    [
      'width on a circle',
      wrap('<circle width="2"/>'),
      'width is not an allowed attribute on <circle>',
    ],
    ['a non-svg root', '<g></g>', 'root is <g>, not <svg>'],
    [
      'an inherited element name',
      wrap('<constructor/>'),
      '<constructor> is not an allowed element',
    ],
    [
      'an inherited element name with an attribute',
      wrap('<hasOwnProperty x="1"/>'),
      '<hasOwnProperty> is not an allowed element',
    ],
    [
      'toString with an attribute',
      wrap('<toString d="M0 0"/>'),
      '<toString> is not an allowed element',
    ],
    [
      'an inherited attribute name',
      wrap('<rect constructor="1"/>'),
      'constructor is not an allowed attribute on <rect>',
    ],
    [
      'NBSP after the root tag name',
      '<svg\u00a0viewBox="0 0 16 16"></svg>',
      'malformed opening tag',
    ],
    [
      'NBSP after a child tag name',
      wrap('<rect\u00a0x="1"/>'),
      'malformed opening tag',
    ],
    [
      'NBSP between attributes',
      wrap('<rect x="1"\u00a0y="1"/>'),
      '\u00a0y is not an allowed attribute on <rect>',
    ],
    [
      'an ideographic space in a closing tag',
      '<svg viewBox="0 0 16 16"></svg\u3000>',
      'malformed closing tag',
    ],
    [
      'NBSP text between elements',
      wrap('\u00a0'),
      'text content "\u00a0" is not allowed',
    ],
    [
      'NBSP inside path data',
      wrap('<path d="M2\u00a08h12"/>'),
      'd="M2\u00a08h12" is not an allowed value',
    ],
    [
      'NBSP inside a paint fallback',
      wrap('<rect fill="var(--isomer-icon-fg,\u00a0#fff)"/>'),
      'fill="var(--isomer-icon-fg,\u00a0#fff)" is not none',
    ],
  ])('rejects %s', (_name, svg, problem) => {
    expect(check(svg)).toThrow(`slideStat icon: ${problem}`);
  });

  it('reports every problem across icons in one error', () => {
    expect(() =>
      assertPackIconsValid({
        primitives: [],
        icons: {
          a: { svg: wrap('<rect fill="#f00" style="x"/>') },
          b: { svg: wrap('<text/>') },
        },
      })
    ).toThrow(
      [
        'Pack icons break the icon rules:',
        '- a icon: fill="#f00" is not none, currentColor, or var(--isomer-icon-*)',
        '- a icon: style is not an allowed attribute on <rect>',
        '- b icon: <text> is not an allowed element',
      ].join('\n')
    );
  });

  describe('agrees with an HTML parser', () => {
    const corpus = [
      wrap('<rect x="1" y="1" width="4" height="4"/>'),
      wrap('\t\n\f\r <path\td="M2 8h12"\nstroke="currentColor"\f/>\r'),
      `<svg\fviewBox="0 0 16 16"\r></svg\n>`,
      wrap('<g transform="translate(1\t1)"><circle cx="8" cy="8" r="2"/></g>'),
      '<svg\u00a0viewBox="0 0 16 16"></svg>',
      '<svg\u2003viewBox="0 0 16 16"></svg>',
      '<svg\u3000viewBox="0 0 16 16"></svg>',
      '<svg\ufeffviewBox="0 0 16 16"></svg>',
      '<svg\u000bviewBox="0 0 16 16"></svg>',
      wrap('<rect\u00a0x="1"/>'),
      wrap('<rect x="1"\u2028y="1"/>'),
      wrap('\u00a0'),
      '<svg viewBox="0 0 16 16"></svg\u00a0>',
    ];

    it.each(corpus.map((svg) => [JSON.stringify(svg), svg]))(
      'accepts %s only if a parser builds one SVG root and no text',
      (_name, svg) => {
        const tree = parsedTree(svg);
        const accepted = passes(svg);
        if (accepted) {
          expect(tree).toMatch(/^<svg viewBox="0 0 16 16">.*<\/>$/);
          expect(tree).not.toMatch(/#text|html:/);
        }
      }
    );

    it('accepts every markup-whitespace spelling in the corpus', () => {
      expect(corpus.slice(0, 4).filter((svg) => !passes(svg))).toEqual([]);
    });

    it('rejects every non-markup separator in the corpus', () => {
      expect(corpus.slice(4).filter(passes)).toEqual([]);
    });
  });
});
