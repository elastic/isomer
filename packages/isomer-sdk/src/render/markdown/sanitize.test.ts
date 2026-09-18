/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { sanitizeMarkdownSource } from './format';

const UNSAFE = String.raw`(?:javascript:|vbscript:|data:text|//evil)`;

// A blocked URL may legitimately survive as inert *text* (an unsafe autolink
// degrades to its own characters, and an escaped tag keeps its attributes as
// prose). What must never survive is a live sink: an inline link/image
// destination, an autolink, a reference-definition target, or an unescaped tag.
const LIVE_SINKS = [
  new RegExp(String.raw`\]\(\s*<?${UNSAFE}`, 'i'), // [x](unsafe) / [x](<unsafe>)
  new RegExp(String.raw`<${UNSAFE}`, 'i'), // <unsafe> autolink
  new RegExp(String.raw`\]:[ \t]*<?${UNSAFE}`, 'i'), // [x]: unsafe
  /<\/?(?:a|img|script|iframe|svg)\b/i, // unescaped raw tag
];

const expectNoLiveSink = (output: string): void => {
  for (const sink of LIVE_SINKS) {
    expect(output, `matched live sink ${sink}`).not.toMatch(sink);
  }
};

describe('sanitizeMarkdownSource', () => {
  describe('blocks unsafe destinations', () => {
    it.each([
      ['inline link', '[open](javascript:alert(1))'],
      ['inline link, angle destination', '[open](<javascript:alert(1)>)'],
      ['inline link with title', '[open](javascript:alert(1) "t")'],
      ['inline image', '![pic](javascript:alert(1))'],
      ['autolink', 'see <javascript:alert(1)> here'],
      ['reference definition', 'See [open][x].\n\n[x]: javascript:alert(1)'],
      ['reference, collapsed usage', 'See [x][].\n\n[x]: vbscript:msgbox(1)'],
      ['reference, shortcut usage', 'See [x].\n\n[x]: vbscript:msgbox(1)'],
      ['reference with title', 'See [x].\n\n[x]: javascript:alert(1) "t"'],
      [
        'reference, angle destination',
        'See [x].\n\n[x]: <javascript:alert(1)>',
      ],
      ['reference image', '![pic][i]\n\n[i]: javascript:alert(1)'],
      ['raw anchor', 'Hi <a href="javascript:alert(1)">click</a>'],
      ['raw image', 'Hi <img src="javascript:alert(1)">'],
      ['raw script', 'Hi <script>alert(1)</script>'],
      ['raw svg onload', 'Hi <svg onload="alert(1)">'],
      ['raw iframe', '<iframe src="data:text/html,<script>alert(1)</script>">'],
      ['data uri link', '[x](data:text/html,<script>alert(1)</script>)'],
      ['protocol-relative link', '[x](//evil.example.test)'],
      ['obfuscated scheme', '[x](jav\tascript:alert(1))'],
      ['entity-encoded colon', '[x](javascript&colon;alert(1))'],
    ])('%s', (_name, markdown) => {
      expectNoLiveSink(sanitizeMarkdownSource(markdown));
    });
  });

  describe('preserves legitimate markdown', () => {
    it('keeps safe inline links, images, and titles', () => {
      expect(sanitizeMarkdownSource('[docs](https://elastic.co/docs)')).toBe(
        '[docs](https://elastic.co/docs)'
      );
      expect(
        sanitizeMarkdownSource('[docs](https://elastic.co "Elastic")')
      ).toBe('[docs](https://elastic.co "Elastic")');
      expect(sanitizeMarkdownSource('![chart](https://cdn.test/c.png)')).toBe(
        '![chart](https://cdn.test/c.png)'
      );
    });

    it('keeps relative navigation targets', () => {
      expect(sanitizeMarkdownSource('[Discover](/app/discover)')).toBe(
        '[Discover](/app/discover)'
      );
    });

    it('keeps URL and email autolinks', () => {
      expect(sanitizeMarkdownSource('see <https://elastic.co> now')).toBe(
        'see <https://elastic.co> now'
      );
      expect(sanitizeMarkdownSource('mail <sre@example.test> now')).toBe(
        'mail <sre@example.test> now'
      );
    });

    it('keeps a safe reference definition and its usages', () => {
      const markdown = 'See [open][x] and [x].\n\n[x]: https://elastic.co/docs';
      expect(sanitizeMarkdownSource(markdown)).toBe(markdown);
    });

    it('leaves ordinary prose, emphasis, code, and comparisons alone', () => {
      const markdown =
        'Latency **rose** by `12%` when p95 < 200ms and 3 > 2.\n\n- item\n- item';
      expect(sanitizeMarkdownSource(markdown)).toBe(markdown);
    });

    it('does not treat a less-than in prose as a tag', () => {
      // No closing `>` follows, so neither is tag-shaped.
      expect(sanitizeMarkdownSource('threshold < 5 and x <y')).toBe(
        'threshold < 5 and x <y'
      );
    });

    it('leaves code spans and fenced blocks untouched', () => {
      const inline = 'Use `Array<string>` and `[x](javascript:alert(1))`.';
      expect(sanitizeMarkdownSource(inline)).toBe(inline);

      const fenced = '```ts\nconst a: Array<string> = [];\n```';
      expect(sanitizeMarkdownSource(fenced)).toBe(fenced);
    });
  });

  describe('degradation shape', () => {
    it('collapses a blocked inline link to its label', () => {
      expect(sanitizeMarkdownSource('[click me](javascript:alert(1))')).toBe(
        'click me'
      );
    });

    it('collapses a blocked image to its alt text', () => {
      expect(sanitizeMarkdownSource('![the chart](javascript:alert(1))')).toBe(
        'the chart'
      );
    });

    it('rewrites a blocked reference definition to an inert target', () => {
      expect(
        sanitizeMarkdownSource('See [x].\n\n[x]: javascript:alert(1)')
      ).toBe('See [x].\n\n[x]: #');
    });

    it('drops the brackets from a blocked autolink', () => {
      expect(sanitizeMarkdownSource('see <javascript:alert(1)> here')).toBe(
        'see javascript:alert(1) here'
      );
    });
  });

  describe('raw-HTML lookaheads', () => {
    // The raw-HTML pass escapes anything tag-shaped, with two negative
    // lookaheads that spare autolinks. Those lookaheads key on shape (a
    // scheme-colon or an `@`), not on safety, so an *unsafe* autolink is
    // spared here too — it is the autolink pass that de-brackets it. The two
    // passes are therefore independent, and these cases pin both halves so a
    // change to either lookahead has to face them.
    it('spares a safe url autolink', () => {
      expect(sanitizeMarkdownSource('see <https://x.test/a> here')).toBe(
        'see <https://x.test/a> here'
      );
    });

    it('spares an email autolink', () => {
      expect(sanitizeMarkdownSource('mail <sre@example.test> now')).toBe(
        'mail <sre@example.test> now'
      );
    });

    it('leaves an unsafe autolink to the autolink pass, de-bracketed', () => {
      const output = sanitizeMarkdownSource('see <javascript:alert(1)> here');

      // De-bracketed rather than escaped: no `&lt;` and no surviving `<`.
      expect(output).toBe('see javascript:alert(1) here');
      expect(output).not.toContain('&lt;');
    });

    it('escapes a genuine raw tag, which no lookahead spares', () => {
      expect(sanitizeMarkdownSource('Hi <a href="https://x.test">y</a>')).toBe(
        'Hi &lt;a href="https://x.test">y&lt;/a>'
      );
    });

    it('leaves prose that is not tag-shaped alone', () => {
      // No `>` ahead, so it is not a tag.
      expect(sanitizeMarkdownSource('p95 <y and q <z')).toBe('p95 <y and q <z');
    });
  });
});
