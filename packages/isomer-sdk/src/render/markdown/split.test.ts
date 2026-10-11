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

const split = (source: string, elements = ['render_attachment']) =>
  splitAuthoredMarkdown(source, { elements });

// Each segment as the host would see it: printed Markdown, or the element.
const shape = (segment: AuthoredMarkdownSegment) =>
  segment.type === 'markdown'
    ? serializeMarkdown(segment.content)
    : { [segment.name]: segment.attributes };

const printed = (source: string, elements?: string[]) =>
  split(source, elements).map(shape);

const sourceOf = (segment: AuthoredMarkdownSegment | undefined): string =>
  segment?.type === 'markdown' ? serializeMarkdown(segment.content) : '';

const TAG = '<render_attachment id="x" />';

describe('splitAuthoredMarkdown', () => {
  it('splits a paragraph in place at a tag', () => {
    expect(
      printed('Here is the note: <render_attachment id="a1" /> Anything else?')
    ).toEqual([
      'Here is the note:',
      { render_attachment: { id: 'a1' } },
      'Anything else?',
    ]);
  });

  it('keeps a list whole and puts the element after it', () => {
    expect(printed(`1. a ${TAG}\n2. b`)).toEqual([
      '1. a\n2. b',
      { render_attachment: { id: 'x' } },
    ]);
  });

  it('keeps the numbering of an item the tag empties', () => {
    expect(printed(`1. a\n2. ${TAG}\n3. b`)).toEqual([
      '1. a\n2.\n3. b',
      { render_attachment: { id: 'x' } },
    ]);
  });

  it('keeps emphasis around a tag and drops emphasis the tag empties', () => {
    expect(printed(`**see ${TAG} here**`)).toEqual([
      '**see here**',
      { render_attachment: { id: 'x' } },
    ]);
    expect(printed(`**${TAG}**`)).toEqual([{ render_attachment: { id: 'x' } }]);
  });

  it('keeps one space between words a tag separated, and none it did not', () => {
    expect(printed(`**before${TAG} after**`)).toEqual([
      '**before after**',
      { render_attachment: { id: 'x' } },
    ]);
    expect(printed(`- a${TAG}b`)).toEqual([
      '- ab',
      { render_attachment: { id: 'x' } },
    ]);
  });

  it('drops a hard break left at the edge of a split', () => {
    expect(printed(`Before  \n${TAG}  \nAfter\\\n${TAG}`)).toEqual([
      'Before',
      { render_attachment: { id: 'x' } },
      'After',
      { render_attachment: { id: 'x' } },
    ]);
  });

  it('keeps a table whole', () => {
    expect(printed(`| a | b |\n| - | - |\n| before ${TAG} | after |`)).toEqual([
      '| a | b |\n| - | - |\n| before | after |',
      { render_attachment: { id: 'x' } },
    ]);
  });

  it.each([
    [`> quoted ${TAG} text`, '> quoted text'],
    [`# before ${TAG} after`, '# before after'],
    [`- item\n  - nested ${TAG}\n- last`, '- item\n  - nested\n- last'],
    [`[see ${TAG} here](https://elastic.co)`, '[see here](https://elastic.co)'],
    [`- [x] done ${TAG}\n- [ ] open`, '- [x] done\n- [ ] open'],
  ])('puts a nested tag after its top-level block: %s', (source, block) => {
    expect(printed(source)).toEqual([
      block,
      { render_attachment: { id: 'x' } },
    ]);
  });

  it.each([
    `\`${TAG}\``,
    `\`\`\`\n${TAG}\n\`\`\``,
    `    ${TAG}`,
    `\\${TAG}`,
    `&lt;render_attachment id="x" />`,
    `![alt ${TAG}](https://elastic.co/a.png)`,
    `[label](https://elastic.co "${TAG}")`,
    `<div>\n${TAG}\n</div>`,
    `<!-- ${TAG} -->`,
    `note[^a]\n\n[^a]: ${TAG}`,
  ])(
    'leaves a tag literal where the parser reads text literally: %s',
    (source) => {
      const segments = split(source);
      expect(segments.every((segment) => segment.type === 'markdown')).toBe(
        true
      );
      expect(segments).toHaveLength(1);
      expect(sourceOf(segments[0])).toContain('render_attachment');
    }
  );

  it('reads a tag between inline HTML', () => {
    expect(printed(`chart <b>${TAG}</b> for Q3`)).toEqual([
      'chart &lt;b>',
      { render_attachment: { id: 'x' } },
      '&lt;/b> for Q3',
    ]);
  });

  it('reads an escaped backslash before a tag as a backslash', () => {
    expect(printed(`\\\\${TAG}`)).toEqual([
      '\\\\',
      { render_attachment: { id: 'x' } },
    ]);
  });

  it('treats a tag alone on its line as a split point', () => {
    expect(printed(`Before\n${TAG}\nAfter`)).toEqual([
      'Before',
      { render_attachment: { id: 'x' } },
      'After',
    ]);
    expect(printed(`Before\n\n${TAG}\n\nAfter`)).toEqual([
      'Before',
      { render_attachment: { id: 'x' } },
      'After',
    ]);
  });

  it('escapes split text that would open another block', () => {
    expect(printed(`Intro ${TAG}\n2. not a list`)).toEqual([
      'Intro',
      { render_attachment: { id: 'x' } },
      '2\\. not a list',
    ]);
  });

  it('handles tags at the start, at the end, adjacent, and without an id', () => {
    expect(
      printed(`${TAG} a <render_attachment /><render_attachment> b ${TAG}`)
    ).toEqual([
      { render_attachment: { id: 'x' } },
      'a',
      { render_attachment: {} },
      { render_attachment: {} },
      'b',
      { render_attachment: { id: 'x' } },
    ]);
  });

  it('drops whitespace-only segments', () => {
    expect(printed(`\n\n${TAG}\n\n   \n${TAG}\n`)).toEqual([
      { render_attachment: { id: 'x' } },
      { render_attachment: { id: 'x' } },
    ]);
  });

  it('reads attributes as written, keyed by lower-cased name', () => {
    expect(
      split(
        `<RENDER_ATTACHMENT ID="a&amp;b" id=ignored bare Path=/api/ q='>' />`
      )
    ).toEqual([
      {
        type: 'element',
        name: 'render_attachment',
        attributes: { id: 'a&amp;b', bare: '', path: '/api/', q: '>' },
      },
    ]);
    expect(
      split('<Render_Attachment id=x/>', ['Render_Attachment'])[0]
    ).toMatchObject({
      name: 'Render_Attachment',
      attributes: { id: 'x/' },
    });
  });

  it('keeps attributes off Object.prototype', () => {
    const [segment] = split('<render_attachment __proto__=x toString=y />');
    const attributes = segment?.type === 'element' ? segment.attributes : {};
    expect(Object.getPrototypeOf(attributes)).toBeNull();
    expect(Object.entries(attributes)).toEqual([
      ['__proto__', 'x'],
      ['tostring', 'y'],
    ]);
  });

  it.each([
    '<render_attachment id="unfinished',
    '<render_attachmentish id=x />',
    '<render_attachment id=x\n/>',
    '</render_attachment>',
    '< render_attachment />',
  ])('leaves an incomplete or other tag as Markdown: %s', (source) => {
    expect(split(source).map((segment) => segment.type)).toEqual(['markdown']);
  });

  it('matches names whole and case-insensitively', () => {
    expect(printed(TAG, ['render'])).toEqual([TAG]);
    expect(printed(TAG, ['RENDER_ATTACHMENT', 'other'])).toEqual([
      { RENDER_ATTACHMENT: { id: 'x' } },
    ]);
  });

  it('returns one md.authored segment when nothing matches', () => {
    for (const [source, elements] of [
      ['Plain *text* with a [link](https://elastic.co)', ['render_attachment']],
      [`${TAG}`, []],
      [`${TAG}`, ['']],
    ] as const) {
      expect(split(source, [...elements])).toEqual([
        { type: 'markdown', content: md.authored(source), source },
      ]);
    }
  });

  it('builds content as md.authored builds it from source', () => {
    for (const segment of split(`1. a ${TAG}\n2. [b](javascript:x)`)) {
      if (segment.type === 'markdown') {
        expect(segment.content).toEqual(md.authored(segment.source));
        expect(serializeMarkdown(segment.content)).not.toContain('javascript:');
      }
    }
  });

  it('is read by the Slack renderer as one list', () => {
    const [list] = split(`1. a ${TAG}\n2. b`);
    const content = list?.type === 'markdown' ? list.content : [];
    expect(markdownContentToSlackBlocks(content)).toMatchObject([
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_list',
            style: 'ordered',
            elements: [
              { elements: [{ type: 'text', text: 'a' }] },
              { elements: [{ type: 'text', text: 'b' }] },
            ],
          },
        ],
      },
    ]);
  });

  describe('definitions', () => {
    it('copies a definition another segment holds, as the source resolved it', () => {
      expect(
        printed(
          `See [d] and ![i][img].\n\n${TAG}\n\n[d]: https://elastic.co "docs"\n[d]: https://ignored.example\n[img]: https://elastic.co/a.png`
        )
      ).toEqual([
        '[d]: https://elastic.co "docs"\n\n[img]: https://elastic.co/a.png\n\nSee [d] and ![i][img].',
        { render_attachment: { id: 'x' } },
      ]);
    });

    it('copies a definition from inside a container, ahead of a later duplicate', () => {
      expect(
        printed(
          `> [d]: https://first.example\n\n${TAG}\n\nSee [d]\n\n> [d]: https://second.example`
        )
      ).toEqual([
        '> [d]: https://first.example',
        { render_attachment: { id: 'x' } },
        '[d]: https://first.example\n\nSee [d]\n\n> [d]: https://second.example',
      ]);
    });

    it('does not copy a definition the segment already holds', () => {
      expect(printed(`See [d]\n\n[d]: https://elastic.co\n\n${TAG}`)).toEqual([
        '[d]: https://elastic.co\n\nSee [d]',
        { render_attachment: { id: 'x' } },
      ]);
    });

    it('prints a footnote cited from another segment as its label', () => {
      expect(printed(`a[^n]\n\n${TAG}\n\n[^n]: note`)).toEqual([
        'a[^n]',
        { render_attachment: { id: 'x' } },
        '[^n]: note',
      ]);
    });
  });

  describe('budget', () => {
    it('cuts over-budget source at each tag into inert pieces', () => {
      const segments = split(
        `${'x'.repeat(16_385)} [link](https://elastic.co) ${TAG} ${TAG} \`${TAG}\``
      );
      expect(segments.map((segment) => segment.type)).toEqual([
        'markdown',
        'element',
        'element',
        'markdown',
        'element',
        'markdown',
      ]);
      const [first] = segments;
      expect(first?.type === 'markdown' && first.source).toMatch(
        /^x+ \[link\]/
      );
      expect(sourceOf(first)).toContain('\\[link\\]');
    });

    it('keeps a serialized segment within the parse budget', () => {
      // 1,500 literal `*`, which the serializer escapes; counting `\*` as
      // two delimiters would put this segment over budget and inert.
      const [first] = split(
        `${'a * '.repeat(1_500)}[link](https://elastic.co) ${TAG}`
      );
      expect(sourceOf(first)).toMatch(
        /^a \\\* a \\\* .*[^\\]\[link\]\(https:\/\/elastic\.co\)$/
      );
    });

    it('replaces sentinel characters already in the source', () => {
      expect(printed(`a0b ${TAG}`)).toEqual([
        'a�0�b',
        { render_attachment: { id: 'x' } },
      ]);
      // A character reference would decode to one in text, so it goes too.
      expect(
        printed(`&#xE000;0&#xE001; &#57344;9&#x0e001; \`&#xe000;\` ${TAG}`)
      ).toEqual([
        '\uFFFD0\uFFFD \uFFFD9\uFFFD `&#xFFFD;`',
        { render_attachment: { id: 'x' } },
      ]);
    });

    it.each([
      ['tags in one paragraph', `${`a ${TAG} `.repeat(500)}`],
      ['tags in nested lists', `${`- a ${TAG}\n  - b ${TAG}\n`.repeat(250)}`],
      [
        'tags in table cells',
        `| a | b |\n| - | - |\n${`| ${TAG} | ${TAG} |\n`.repeat(250)}`,
      ],
      ['tags in one strong run', `**${`a ${TAG} `.repeat(500)}**`],
      ['unclosed tags', '<render_attachment '.repeat(800)],
      ['unclosed quoted values', '<render_attachment a="'.repeat(700)],
      ['attributes without a close', `<render_attachment${' a'.repeat(8_000)}`],
      ['angle brackets', `${'<'.repeat(2_000)}${TAG}`],
    ])('stays fast at the budget: %s', (_, source) => {
      const padded = source.slice(0, 16_384);
      const started = performance.now();
      split(padded);
      expect(performance.now() - started).toBeLessThan(500);
    });

    it('stays linear far past the budget', () => {
      const source = `${'<a '.repeat(300_000)}${TAG}`;
      const started = performance.now();
      const segments = split(source);
      expect(performance.now() - started).toBeLessThan(1_000);
      expect(segments.at(-1)).toMatchObject({ type: 'element' });
    });
  });
});
