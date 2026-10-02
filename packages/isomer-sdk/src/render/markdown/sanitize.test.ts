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
  it.each([
    '[x](/a?x=&amp;#47;)',
    '![x](/a?x=&amp;#47;)',
    '[x][ref]\n\n[ref]: /a?x=&amp;#47;',
    '[x](/a?x=&#38;colon;)',
  ])('preserves references decoded once in %s', (source) => {
    expect(sanitizeMarkdownSource(source)).toBe(source);
    expect(sanitizeMarkdownSource(sanitizeMarkdownSource(source))).toBe(source);
  });

  it('preserves a decoded reference while repairing another part of a link', () => {
    const source = '[![x](javascript:x)](/a?x=&amp;#47;)';
    expect(sanitizeMarkdownSource(source)).toBe('[x](/a?x=&amp;#47;)');
  });

  it.each([']'.repeat(40_000), ']'.repeat(16_000), 'a'.repeat(20_000)])(
    'bounds parser work for adversarial or oversized source',
    (prefix) => {
      const start = performance.now();
      const result = sanitizeMarkdownSource(`${prefix}[x](javascript:alert)`);
      expect(result).toContain('\\[x\\]');
      expect(performance.now() - start).toBeLessThan(250);
    }
  );

  it('handles a deeply nested blockquote without throwing', () => {
    expect(() => sanitizeMarkdownSource('> '.repeat(4000) + 'x')).not.toThrow();
  });
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
      ['bracket in label', '[a [b] c](javascript:alert(1))'],
      ['image in label', '[![alt](https://x.test/i.png)](javascript:alert(1))'],
      ['escaped bracket in label', String.raw`[a\] b](javascript:alert(1))`],
      ['code span in label', '[`x`](javascript:alert(1))'],
      ['blocked link in blocked label', '[[x](javascript:y)](javascript:z)'],
      ['blocked image in safe label', '[![a](javascript:x)](https://ok.test)'],
      ['link inside an html block', '<div>\n[x](javascript:alert(1))\n</div>'],
      ['link in a table cell', '| a |\n| - |\n| [x](javascript:alert(1)) |'],
      ['entity-encoded tab', '[x](java&Tab;script:alert(1))'],
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

  describe('reference destination policies', () => {
    it.each(['![chart][asset]', '![asset][]', '![asset]'])(
      'preserves a multiline data-image reference in %s',
      (usage) => {
        const source = `${usage}\n\n[asset]:\n  data:image/png;base64,aGVsbG8= "Chart"`;
        expect(sanitizeMarkdownSource(source)).toBe(source);
        expect(sanitizeMarkdownSource(sanitizeMarkdownSource(source))).toBe(
          source
        );
      }
    );

    it('applies each policy to a definition shared by a link and an image', () => {
      const data = 'data:image/png;base64,aGVsbG8=';
      expect(
        sanitizeMarkdownSource(
          `[open][asset] ![chart][asset]\n\n[asset]: ${data}`
        )
      ).toBe(`open ![chart][asset]\n\n[asset]: ${data}`);
      expect(
        sanitizeMarkdownSource(
          '[email][asset] ![chart][asset]\n\n[asset]: mailto:a@example.com'
        )
      ).toBe('[email][asset] chart\n\n[asset]: mailto:a@example.com');
    });

    it('keeps safe HTTP references shared by links and images unchanged', () => {
      const source =
        '[open][asset] ![chart][asset]\n\n[asset]: https://example.com/chart.png';
      expect(sanitizeMarkdownSource(source)).toBe(source);
    });

    it('resolves case-insensitive references to the first definition', () => {
      const source =
        '![chart][ASSET]\n\n[asset]: data:image/png;base64,aGVsbG8=\n[Asset]: mailto:a@example.com';
      expect(sanitizeMarkdownSource(source)).toBe(source);
    });

    it('degrades a blocked reference image to escaped alt text', () => {
      expect(
        sanitizeMarkdownSource(
          '![a\\[b\\]][asset]\n\n[asset]: javascript:alert(1)'
        )
      ).toBe('a\\[b\\]\n\n[asset]: #');
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

    it('keeps a blocked label whole, brackets and code included', () => {
      expect(sanitizeMarkdownSource('[a [b] c](javascript:alert(1))')).toBe(
        'a [b] c'
      );
      expect(sanitizeMarkdownSource('[`x` *y*](javascript:alert(1))')).toBe(
        '`x` *y*'
      );
    });

    it('sanitizes inside a safe label and keeps the destination', () => {
      expect(
        sanitizeMarkdownSource('[![a](javascript:x) b](https://ok.test)')
      ).toBe('[a b](https://ok.test)');
    });

    it('drops the brackets from a blocked autolink', () => {
      expect(sanitizeMarkdownSource('see <javascript:alert(1)> here')).toBe(
        'see javascript:alert(1) here'
      );
    });
  });

  describe('raw HTML and autolinks', () => {
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

  it.each([
    ['nested blockquotes', `${'>'.repeat(20_000)} `],
    ['nested list items', '- '.repeat(20_000)],
    [
      'indented list lines',
      '- a\n  - b\n    - c\n'.repeat(1) + `${' '.repeat(300)}- d\n`,
    ],
    ['nested emphasis', `${'*'.repeat(20_000)}x${'*'.repeat(20_000)} `],
    ['spread emphasis', `${'*a '.repeat(5_000)}${'a* '.repeat(5_000)}`],
    ['nested link labels', `${'['.repeat(5_000)}x${'](y)'.repeat(5_000)} `],
  ])(
    'degrades nesting too deep to parse to inert text: %s',
    (_name, prefix) => {
      // Escaped brackets cannot open a link, so the destination is inert text.
      const source = `${prefix}[x](javascript:alert(1))`;
      expect(sanitizeMarkdownSource(source)).toBe(
        source.replace(/[[\]\\]/g, '\\$&').replace(/</g, '&lt;')
      );
    }
  );

  it('keeps prose with many intraword underscores parseable', () => {
    const prose = 'snake_case_name '.repeat(1_000);
    expect(sanitizeMarkdownSource(`${prose}[x](javascript:alert(1))`)).toBe(
      `${prose}x`
    );
  });

  it('runs in linear time on long whitespace and unclosed tags', () => {
    const started = performance.now();
    for (const input of [
      `${'*a '.repeat(500)}${'a* '.repeat(500)}`,
      `${'['.repeat(500)}x${'](y)'.repeat(500)}`,
      Array.from({ length: 128 }, (_, i) => `${' '.repeat(i * 2)}- x`).join(
        '\n'
      ),
      `[a](${' '.repeat(50_000)}x`,
      `[a](x${' '.repeat(50_000)}y`,
      '<a'.repeat(50_000),
    ]) {
      sanitizeMarkdownSource(input);
    }
    expect(performance.now() - started).toBeLessThan(1_000);
  });
});
