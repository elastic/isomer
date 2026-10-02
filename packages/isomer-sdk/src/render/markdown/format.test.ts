/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromMarkdown } from 'mdast-util-from-markdown';
import { describe, expect, it } from 'vitest';

import { markdownImage, markdownLink, markdownLinkWrap } from './format';

describe('markdownLink', () => {
  it('escapes ] and \\ in the label', () => {
    expect(markdownLink('a] b\\c', 'https://example.com')).toBe(
      '[a\\] b\\\\c](https://example.com)'
    );
  });

  it('percent-encodes parens and whitespace in the destination', () => {
    expect(markdownLink('x', 'https://example.com/(a b)')).toBe(
      '[x](https://example.com/%28a%20b%29)'
    );
  });
});

describe('link formatters read back by a Markdown parser', () => {
  const destinations = (markdown: string): string[] => {
    const found: string[] = [];
    const walk = (node: {
      type: string;
      url?: string;
      children?: unknown[];
    }) => {
      if (node.url !== undefined) found.push(node.url);
      for (const child of node.children ?? []) walk(child as typeof node);
    };
    walk(fromMarkdown(markdown));
    return found;
  };

  it.each([
    ['an escaped colon', 'javascript\\:alert(1)'],
    ['a reference to a colon reference', 'javascript&#38;#58;alert(1)'],
    ['references to slashes', '&#38;#47;&#38;#47;evil.example'],
  ])('never yields a live destination from %s', (_name, href) => {
    for (const markdown of [
      markdownLink('x', href),
      markdownImage('x', href),
      markdownLinkWrap('x', href),
    ]) {
      for (const url of destinations(markdown)) {
        expect(url).not.toMatch(/^\s*(?:javascript:|\/\/)/i);
      }
    }
  });
});
