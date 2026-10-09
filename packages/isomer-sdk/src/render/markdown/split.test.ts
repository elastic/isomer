/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { markdownContentToSlackBlocks } from '../slack/markdown_content';

import { md, serializeMarkdown } from './builder';
import { type AuthoredMarkdownSegment, splitAuthoredMarkdown } from './split';

const TAG = 'render_attachment';
const tag = (id: string) => `<${TAG} id="${id}" />`;

const split = (source: string, elements: readonly string[] = [TAG]) =>
  splitAuthoredMarkdown(source, { elements }).map(
    (segment: AuthoredMarkdownSegment) =>
      segment.type === 'markdown'
        ? serializeMarkdown(segment.content)
        : { ...segment.attributes }
  );

describe('splitAuthoredMarkdown', () => {
  it('returns `md.authored` content when no element appears', () => {
    const source = 'a *b*\n\n[x](javascript:alert(1))';
    const segments = splitAuthoredMarkdown(source, { elements: [TAG] });
    expect(segments).toEqual([
      { type: 'markdown', content: md.authored(source), source },
    ]);
    expect(splitAuthoredMarkdown(' \n ', { elements: [TAG] })).toEqual([]);
    expect(split(tag('x'), [])).toEqual([tag('x')]);
  });

  it('cuts a top-level block that is only a tag in place', () => {
    expect(split(`a\n\n${tag('x')}\n\nb`)).toEqual(['a', { id: 'x' }, 'b']);
  });

  it('splits a paragraph at a tag that stands in it directly', () => {
    expect(split(`Here is the note: ${tag('a1')} Anything else?`)).toEqual([
      'Here is the note:',
      { id: 'a1' },
      'Anything else?',
    ]);
    expect(split(`Here:\n${tag('a')}\nMore`)).toEqual([
      'Here:',
      { id: 'a' },
      'More',
    ]);
  });

  it('keeps a list whole and follows it with the element', () => {
    expect(split(`1. a ${tag('x')}\n2. b`)).toEqual([
      '1. a\n2. b',
      { id: 'x' },
    ]);
    expect(split(`1. a\n   ${tag('x')}\n2. b\n\nc`)).toEqual([
      '1. a\n2. b',
      { id: 'x' },
      'c',
    ]);
  });

  it('keeps emphasis around a tag balanced', () => {
    expect(split(`**see ${tag('x')} here**`)).toEqual([
      '**see here**',
      { id: 'x' },
    ]);
    expect(split(`a **b ${tag('x')}** c`)).toEqual(['a **b** c', { id: 'x' }]);
  });

  it('keeps a table whole', () => {
    const [table, attachment] = split(
      `| a | b |\n| - | - |\n| c ${tag('x')} | d |`
    );
    expect(table).toBe('| a | b |\n| - | - |\n| c | d |');
    expect(attachment).toEqual({ id: 'x' });
  });

  it('keeps a quote and a heading whole', () => {
    expect(split(`> a\n> ${tag('x')}\n> b`)).toEqual([
      '> a\n>\n> b',
      { id: 'x' },
    ]);
    expect(split(`## Chart ${tag('x')}\n\nBody`)).toEqual([
      '## Chart',
      { id: 'x' },
      'Body',
    ]);
  });

  it('leaves a tag in code as text', () => {
    const fenced = `\`\`\`\n${tag('x')}\n\`\`\``;
    expect(split(fenced)).toEqual([fenced]);
    const inline = `Use \`${tag('x')}\` here.`;
    expect(split(inline)).toEqual([inline]);
    expect(split(`\`${tag('a')}\` ${tag('b')}`)).toEqual([
      `\`${tag('a')}\``,
      { id: 'b' },
    ]);
  });

  it('leaves an escaped tag as text', () => {
    expect(split(`\\${tag('x')}`)).toEqual([`\\${tag('x')}`]);
  });

  it('handles tags at the start, at the end, and side by side', () => {
    expect(split(`${tag('a')} text ${tag('b')}`)).toEqual([
      { id: 'a' },
      'text',
      { id: 'b' },
    ]);
    expect(split(`${tag('a')}${tag('b')}\n${tag('c')}`)).toEqual([
      { id: 'a' },
      { id: 'b' },
      { id: 'c' },
    ]);
  });

  it('returns an element without an id', () => {
    expect(split(`a <${TAG} />`)).toEqual(['a', {}]);
    expect(split(`<${TAG}>`)).toEqual([{}]);
  });

  it('reads attributes case-insensitively, first one winning', () => {
    const [segment] = splitAuthoredMarkdown(
      `<Render_Attachment ID='a' id="b" version=2 hidden data-x="1 > 0" />`,
      { elements: [TAG] }
    );
    expect(segment).toEqual({
      type: 'element',
      name: TAG,
      attributes: { id: 'a', version: '2', hidden: '', 'data-x': '1 > 0' },
    });
  });

  it('matches whole names only, and every listed name', () => {
    expect(split(`<${TAG}s id="x" />`)).toEqual([`<${TAG}s id="x" />`]);
    expect(
      splitAuthoredMarkdown(`<render path="p" />\n\n${tag('x')}`, {
        elements: ['render', TAG],
      }).map((segment) => segment.type === 'element' && segment.name)
    ).toEqual(['render', TAG]);
  });

  it('sanitizes each markdown segment', () => {
    expect(
      split(`[x](javascript:alert(1)) ${tag('a')} <img src=x onerror=y>`)
    ).toEqual(['x', { id: 'a' }, '&lt;img src=x onerror=y>']);
  });

  it('leaves a tag inside a raw HTML block as text', () => {
    expect(split(`<div>\n${tag('a')}\n</div>`)).toEqual([
      `&lt;div>\n&lt;${TAG} id="a" />\n&lt;/div>`,
    ]);
  });

  it('resolves references in every segment', () => {
    expect(
      split(
        `See [docs][d].\n\n${tag('x')}\n\nAgain [d].\n\n${tag('y')}\n\nNone.\n\n[d]: https://elastic.co`
      )
    ).toEqual([
      'See [docs](https://elastic.co).',
      { id: 'x' },
      'Again [d](https://elastic.co).',
      { id: 'y' },
      'None.',
    ]);
  });

  it('prints references as text when inlining them would pass the cap', () => {
    const url = `https://elastic.co/${'a'.repeat(1000)}`;
    expect(split(`[d]: ${url}\n\n${tag('x')}\n\n[a][d] [b][d]`)).toEqual([
      { id: 'x' },
      'a b',
    ]);
  });

  it('escapes split text that would otherwise open another block', () => {
    expect(split(`a ${tag('x')}\n2. b`)).toEqual(['a', { id: 'x' }, '2\\. b']);
    expect(split(`a\n--- ${tag('x')}`)).toEqual(['a\n\\---', { id: 'x' }]);
  });

  it('keeps emphasis that loses its only content or an edge to a tag', () => {
    expect(split(`a **${tag('x')} b**`)).toEqual(['a **b**', { id: 'x' }]);
    expect(split(`a _b ${tag('x')}_ c`)).toEqual(['a _b_ c', { id: 'x' }]);
    expect(split(`**${tag('x')}**`)).toEqual([{ id: 'x' }]);
    expect(split(`a\n\n_${tag('x')}_\n\nb`)).toEqual(['a', { id: 'x' }, 'b']);
  });

  it('drops a list item that held only a tag', () => {
    expect(split(`- a\n  - ${tag('x')}`)).toEqual(['- a', { id: 'x' }]);
    expect(split(`* a\n* ${tag('x')}\n\n- b`)).toEqual([
      '- a',
      { id: 'x' },
      '- b',
    ]);
  });

  it('keeps a tag in link or image metadata as written', () => {
    const bare = `<${TAG} />`;
    for (const source of [
      `![a](https://elastic.co/x "${bare}")`,
      `[a](https://elastic.co/x "${bare}")`,
      `[a](https://elastic.co/x '${tag('x')}')`,
      `![${tag('x')}](https://elastic.co/x)`,
      `[a][r]\n\n[r]: https://elastic.co "${bare}"`,
    ]) {
      expect(split(source)).toEqual([serializeMarkdown(md.authored(source))]);
    }
  });

  it('cuts a tag from a link label', () => {
    expect(split(`[see ${tag('x')}](https://elastic.co)`)).toEqual([
      '[see](https://elastic.co)',
      { id: 'x' },
    ]);
  });

  it('resolves a reference to a definition nested in a later block', () => {
    expect(
      split(`See [d].\n\n${tag('x')}\n\n> [d]: https://elastic.co`)
    ).toEqual([
      'See [d](https://elastic.co).',
      { id: 'x' },
      '> [d]: https://elastic.co',
    ]);
  });

  it('skips inlining that would push a segment past the parse budget', () => {
    const url = `https://elastic.co/${'a'.repeat(4000)}`;
    const body = 'x '.repeat(4500);
    const [, segment] = splitAuthoredMarkdown(
      `[d]: ${url}\n\n${tag('x')}\n\n${body}[a][d] [b][d] **kept**`,
      { elements: [TAG] }
    );
    expect(segment?.type === 'markdown' && segment.source).toBe(
      `${body.trimEnd()} a b **kept**`
    );
    expect(
      segment?.type === 'markdown' && serializeMarkdown(segment.content)
    ).toMatch(/\*\*kept\*\*$/);
  });

  it('keeps a footnote only in the segment that holds its definition', () => {
    expect(
      split(
        `Note[^1].\n\n${tag('x')}\n\nAgain[^1].\n\n[^1]: See [d].\n\n[d]: https://elastic.co`
      )
    ).toEqual([
      'Note\\[^1].',
      { id: 'x' },
      'Again[^1].\n\n[^1]: See [d](https://elastic.co).',
    ]);
  });

  it('leaves a tag in a footnote definition as written', () => {
    expect(split(`a[^1]\n\n[^1]: ${tag('x')}`)).toEqual([
      `a[^1]\n\n[^1]: ${tag('x')}`,
    ]);
  });

  it('keeps an indented code block after a paragraph split', () => {
    expect(split(`a ${tag('x')}\n\n    code`)).toEqual([
      'a',
      { id: 'x' },
      '```\ncode\n```',
    ]);
  });

  it('keeps inline formatting after a tag in place', () => {
    expect(split(`Before ${tag('x')} **After**`)).toEqual([
      'Before',
      { id: 'x' },
      '**After**',
    ]);
    expect(
      split(`Before ${tag('x')} _after_ [link](https://elastic.co)`)
    ).toEqual(['Before', { id: 'x' }, '_after_ [link](https://elastic.co)']);
  });

  it('resolves a reference to a definition nested in a list', () => {
    expect(
      split(`See [d].\n\n${tag('x')}\n\n- item\n\n  [d]: https://elastic.co`)
    ).toEqual([
      'See [d](https://elastic.co).',
      { id: 'x' },
      '- item\n\n  [d]: https://elastic.co',
    ]);
  });

  it('reads an entity-encoded tag as text', () => {
    expect(split(`&lt;${TAG} id="x" /> ${tag('x')}`)).toEqual([
      `\\<${TAG} id="x" />`,
      { id: 'x' },
    ]);
  });

  it('reads `<` and `>` inside a quoted attribute value', () => {
    expect(split(`a <${TAG} id="x" note="1 < 2" /> b`)).toEqual([
      'a',
      { id: 'x', note: '1 < 2' },
      'b',
    ]);
  });

  it('reads an entity in an attribute value as written', () => {
    const [, segment] = splitAuthoredMarkdown(`a <${TAG} id="x&amp;y" />`, {
      elements: [TAG],
    });
    expect(segment).toEqual({
      type: 'element',
      name: TAG,
      attributes: { id: 'x&amp;y' },
    });
  });

  it('keeps a trailing `/` in an unquoted value, as HTML reads it', () => {
    expect(split(`a <${TAG} path=/api/> b`)).toEqual([
      'a',
      { path: '/api/' },
      'b',
    ]);
    expect(split(`a <${TAG} path=/api/ /> b`)).toEqual([
      'a',
      { path: '/api/' },
      'b',
    ]);
  });

  it('resolves a reference to the first of duplicate definitions', () => {
    expect(
      split(
        `> [d]: https://first.example\n\n${tag('x')}\n\nSee [d].\n\n> [d]: https://second.example`
      )
    ).toEqual([
      '> [d]: https://first.example',
      { id: 'x' },
      'See [d](https://first.example).\n\n> [d]: https://second.example',
    ]);
  });

  it('drops a top-level footnote definition its segment does not cite', () => {
    expect(
      split(
        `[^n]: see [d]\n\n    [d]: https://first.example\n\n${tag('x')}\n\nRef [^n] [d]\n\n> [d]: https://second.example`
      )
    ).toEqual([
      { id: 'x' },
      'Ref \\[^n] [d](https://first.example)\n\n> [d]: https://second.example',
    ]);
  });

  it('resolves a link to its first definition when another segment holds a duplicate', () => {
    expect(
      split(
        `[d]: https://first.example\n\n[^n]: note\n\n    [d]: https://second.example\n\n${tag('x')}\n\nSee [d] [^n]`
      )
    ).toEqual([{ id: 'x' }, 'See [d](https://first.example) \\[^n]']);
  });

  it('keeps an indented list a list', () => {
    expect(
      split(
        `> [d]: https://first.example\n\n${tag('x')}\n\nSee [d]\n\n   - a\n     continued\n\n> [d]: https://second.example`
      )
    ).toEqual([
      '> [d]: https://first.example',
      { id: 'x' },
      'See [d](https://first.example)\n\n- a\n  continued\n\n> [d]: https://second.example',
    ]);
  });

  it('keeps escaped text within the parse budget', () => {
    const body = 'a * b '.repeat(1500);
    const [first] = splitAuthoredMarkdown(
      `[x](https://elastic.co) ${body}\n\n${tag('x')}`,
      { elements: [TAG] }
    );
    expect(
      first?.type === 'markdown' && serializeMarkdown(first.content)
    ).toMatch(/^\[x\]\(https:\/\/elastic\.co\) a \\\* b/);
  });

  it('keeps a list item that holds only a definition', () => {
    expect(
      split(
        `[d]: https://first.example\n\n${tag('x')}\n\n1. a\n2. [d]: https://second.example\n3. c`
      )
    ).toEqual([{ id: 'x' }, '1. a\n2. [d]: https://second.example\n3. c']);
    expect(
      split(
        `[d]: https://first.example\n\n${tag('x')}\n\n- a\n  - [d]: https://second.example`
      )
    ).toEqual([{ id: 'x' }, '- a\n  - [d]: https://second.example']);
  });

  it('prints only the first definition of a footnote', () => {
    expect(
      split(`${tag('x')}\n\nSee[^n]\n\n[^n]: first\n\n[^n]: second`)
    ).toEqual([{ id: 'x' }, 'See[^n]\n\n[^n]: first']);
    expect(
      split(`[^n]: first\n\n${tag('x')}\n\nSee[^n]\n\n[^n]: second`)
    ).toEqual([{ id: 'x' }, 'See\\[^n]']);
  });

  it('prints a footnote cited before its definition segment as text', () => {
    expect(
      split(
        `> [^n]: first\n\n${tag('x')}\n\n    code\n\n[^n] ref\n\n> [^n]: second`
      )
    ).toEqual([
      '> [^n]: first',
      { id: 'x' },
      '```\ncode\n```\n\n\\[^n] ref\n\n> [^n]: second',
    ]);
  });

  it('splits before text that follows a tag alone on its line', () => {
    expect(split(`${tag('x')}\nfollowing text`)).toEqual([
      { id: 'x' },
      'following text',
    ]);
    expect(split(`Here:\n${tag('x')}\nMore`)).toEqual([
      'Here:',
      { id: 'x' },
      'More',
    ]);
  });

  it('keeps nested elements in document order', () => {
    expect(split(`- a ${tag('1')} b ${tag('2')} a ${tag('3')}`)).toEqual([
      '- a b a',
      { id: '1' },
      { id: '2' },
      { id: '3' },
    ]);
  });

  it('resolves a reference to the first of duplicate nested definitions', () => {
    expect(
      split(
        `See [d].\n\n${tag('x')}\n\n> [d]: https://first.example\n\n> [d]: https://second.example`
      )
    ).toEqual([
      'See [d](https://first.example).',
      { id: 'x' },
      '> [d]: https://first.example\n\n> [d]: https://second.example',
    ]);
  });

  it('keeps an indented code block after a lifted tag', () => {
    expect(split(`## a ${tag('x')}\n\n    code`)).toEqual([
      '## a',
      { id: 'x' },
      '```\ncode\n```',
    ]);
  });

  it('keeps a segment source that `md.authored` rebuilds', () => {
    for (const segment of splitAuthoredMarkdown(
      `**a ${tag('x')}** [b][r]\n\n[r]: https://elastic.co`,
      { elements: [TAG] }
    )) {
      if (segment.type === 'markdown') {
        expect(serializeMarkdown(md.authored(segment.source))).toBe(
          serializeMarkdown(segment.content)
        );
      }
    }
  });

  it('feeds the Slack renderer unchanged', () => {
    const [list] = splitAuthoredMarkdown(`1. a ${tag('x')}\n2. b`, {
      elements: [TAG],
    });
    expect(
      list?.type === 'markdown' && markdownContentToSlackBlocks(list.content)
    ).toMatchObject([{ type: 'rich_text' }]);
  });

  describe('past the parse budget', () => {
    it('cuts at each tag and degrades every piece to inert text', () => {
      const prose = 'a'.repeat(20_000);
      const segments = splitAuthoredMarkdown(
        `${prose} [x](javascript:y) ${tag('a')} **b**`,
        { elements: [TAG] }
      );
      expect(segments.map(({ type }) => type)).toEqual([
        'markdown',
        'element',
        'markdown',
      ]);
      const [before, , after] = segments;
      expect(
        before?.type === 'markdown' && serializeMarkdown(before.content)
      ).toBe(`${prose} \\[x\\](javascript:y)`);
      expect(after).toMatchObject({ type: 'markdown', source: '**b**' });
    });
  });

  describe('bounds its work on adversarial input', () => {
    const timed = (source: string) => {
      const started = performance.now();
      splitAuthoredMarkdown(source, { elements: [TAG] });
      return performance.now() - started;
    };

    it.each([
      ['unclosed tags', `<${TAG} `.repeat(800) + tag('x')],
      ['unclosed quotes', `<${TAG} id="`.repeat(600) + tag('x')],
      ['tags splitting one paragraph', `a ${tag('x')} `.repeat(500)],
      ['tags inside one strong run', `**${`a ${tag('x')} `.repeat(500)}**`],
      [
        'tags in nested list items',
        Array.from(
          { length: 100 },
          (_, i) => `${'  '.repeat(i % 50)}- ${tag('x')}`
        ).join('\n'),
      ],
      [
        'tags in table cells',
        `| a |\n| - |\n${`| ${tag('x')} |\n`.repeat(450)}`,
      ],
    ])('%s at the input budget', (_name, source) => {
      expect(source.length).toBeLessThanOrEqual(16_384);
      expect(timed(source)).toBeLessThan(500);
    });

    it('caps what inlining adds at the length of the source', () => {
      const source = `${`x[a][d] ${tag('x')} `.repeat(250)}\n\n[d]: https://elastic.co/${'a'.repeat(7_000)}`;
      expect(source.length).toBeLessThanOrEqual(16_384);
      const started = performance.now();
      const segments = splitAuthoredMarkdown(source, { elements: [TAG] });
      expect(performance.now() - started).toBeLessThan(500);
      expect(
        segments.reduce(
          (total, segment) =>
            total + (segment.type === 'markdown' ? segment.source.length : 0),
          0
        )
      ).toBeLessThan(2 * source.length);
    });

    it.each([
      ['unclosed tags', `<${TAG} `.repeat(50_000)],
      ['tags', `${tag('x')} a `.repeat(20_000)],
    ])('%s far past the input budget', (_name, source) => {
      expect(timed(source)).toBeLessThan(500);
    });
  });
});
