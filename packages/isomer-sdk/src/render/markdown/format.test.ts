/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromMarkdown } from 'mdast-util-from-markdown';
import { describe, expect, it } from 'vitest';

import { md, serializeMarkdown } from './builder';

describe('md links and images read back by a Markdown parser', () => {
  const destinations = (markdown: string): string[] => {
    const found: string[] = [];
    const walk = (node: {
      type: string;
      url?: string;
      children?: unknown[];
    }) => {
      if (node.url !== undefined) {
        found.push(node.url);
      }
      for (const child of node.children ?? []) {
        walk(child as typeof node);
      }
    };
    walk(fromMarkdown(markdown));
    return found;
  };

  it.each([
    ['an escaped colon', 'javascript\\:alert(1)'],
    ['a reference to a colon reference', 'javascript&#38;#58;alert(1)'],
    ['references to slashes', '&#38;#47;&#38;#47;evil.example'],
  ])('never yields a live destination from %s', (_name, href) => {
    for (const content of [md.link('x', href), md.image('x', href)]) {
      for (const url of destinations(
        serializeMarkdown(md.paragraph(content))
      )) {
        expect(url).not.toMatch(/^\s*(?:javascript:|\/\/)/i);
      }
    }
  });

  it('keeps a label and destination intact through brackets, parens, and spaces', () => {
    const markdown = serializeMarkdown(
      md.paragraph(md.link('a] b\\c', 'https://example.com/(a b)'))
    );

    expect(destinations(markdown)).toEqual(['https://example.com/(a b)']);
    const text = (node: { value?: string; children?: unknown[] }): string =>
      (node.value ?? '') +
      (node.children ?? []).map((child) => text(child as typeof node)).join('');
    expect(text(fromMarkdown(markdown))).toBe('a] b\\c');
  });
});
