/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';

import { markdownContentToSlackBlocks } from '../slack/markdown_content';

import { parseAuthoredMarkdown, renderAuthoredMarkdown } from './authored';
import { serializeMarkdown } from './builder';

const parse = (source: string) =>
  parseAuthoredMarkdown(source, { elements: ['render_attachment'] });
const printed = (source: string): string[] =>
  renderAuthoredMarkdown(parse(source), {
    markdown: serializeMarkdown,
    element: ({ attributes }) => `ATTACHMENT:${attributes.id ?? ''}`,
  });

describe('authored document with host elements', () => {
  it('keeps a complete numbered list before its attachment', () => {
    const document = parse('1. a <render_attachment id="x" />\n2. b');
    const blocks = renderAuthoredMarkdown(document, {
      markdown: markdownContentToSlackBlocks,
      element: () => [],
    }).flat();
    expect(blocks).toMatchObject([
      {
        type: 'rich_text',
        elements: [
          {
            type: 'rich_text_list',
            style: 'ordered',
            elements: [
              { elements: [{ type: 'text', text: 'a ' }] },
              { elements: [{ type: 'text', text: 'b' }] },
            ],
          },
        ],
      },
    ]);
    expect(document.elements.map(({ attributes }) => attributes.id)).toEqual([
      'x',
    ]);
  });

  it('keeps emphasis and removes wrappers containing only a marker', () => {
    expect(printed('**see <render_attachment id="x" /> here**')).toEqual([
      '**see  here**',
      'ATTACHMENT:x',
    ]);
    expect(printed('**<render_attachment id="x" />**')).toEqual([
      'ATTACHMENT:x',
    ]);
  });

  it('lets a standalone marker interrupt a paragraph', () => {
    expect(printed('Before\n<render_attachment id="x" />\nAfter')).toEqual([
      'Before',
      'ATTACHMENT:x',
      'After',
    ]);
  });

  it.each([
    '`<render_attachment id="x" />`',
    '```\n<render_attachment id="x" />\n```',
    '\\<render_attachment id="x" />',
    '&lt;render_attachment id="x" />',
    '![alt <render_attachment id="x" />](https://elastic.co)',
    '[label](https://elastic.co "<render_attachment id=x />")',
    '<div>\n<render_attachment id="x" />\n</div>',
    'note[^a]\n\n[^a]: <render_attachment id="x" />',
  ])('keeps a marker literal in its protected context: %s', (source) => {
    expect(parse(source).elements).toEqual([]);
    expect(printed(source).join('')).toContain('render');
  });

  it('resolves references from the complete document', () => {
    const document = parse(
      'See [d].\n\n<render_attachment id=x />\n\n[d]: https://elastic.co "docs"'
    );
    const output = renderAuthoredMarkdown(document, {
      markdown: markdownContentToSlackBlocks,
      element: () => [],
    });
    expect(JSON.stringify(output)).toContain('"url":"https://elastic.co"');
    expect(
      printed(
        'See [d].\n\n<render_attachment id=x />\n\n[d]: https://elastic.co "docs"'
      )[0]
    ).toContain('[d](https://elastic.co "docs")');
  });

  it('uses the library for attributes and preserves entity spelling', () => {
    const [element] = parse(
      '<RENDER_ATTACHMENT ID="a&amp;b" id=ignored bare __proto__=safe />'
    ).elements;
    expect(element?.name).toBe('render_attachment');
    expect(element?.attributes).toEqual({
      id: 'a&amp;b',
      bare: '',
      ['__proto__']: 'safe',
    });
    expect(Object.getPrototypeOf(element?.attributes)).toBeNull();
  });

  it('extracts markers while leaving over-budget text inert', () => {
    const document = parse(
      `${'x'.repeat(16_385)}<render_attachment id=x />[link](https://elastic.co)`
    );
    expect(document.inert).toBe(true);
    expect(document.elements.map(({ attributes }) => attributes.id)).toEqual([
      'x',
    ]);
    const output = renderAuthoredMarkdown(document, {
      markdown: markdownContentToSlackBlocks,
      element: () => [],
    });
    expect(JSON.stringify(output)).not.toContain('"type":"link"');
  });

  it.each([
    '| a | b |\n| - | - |\n| before <render_attachment id=x /> | after |',
    '> before <render_attachment id=x /> after',
    '# before <render_attachment id=x /> after',
    '- [x] before <render_attachment id=x />\n- next',
    '[before <render_attachment id=x /> after](https://elastic.co)',
  ])(
    'keeps the entire containing block before a nested marker: %s',
    (source) => {
      const output = printed(source);
      expect(output).toHaveLength(2);
      expect(output[0]).toContain('before');
      expect(output[1]).toBe('ATTACHMENT:x');
      expect(output[0]).not.toContain('render_attachment');
    }
  );

  it('preserves footnotes once without renaming or following reference cycles', () => {
    const output = printed(
      'a[^n]\n\n<render_attachment id=x />\n\nb[^n]\n\n[^n]: first [^m]\n[^m]: back [^n]\n[^n]: ignored'
    );
    expect(output.join('\n')).toContain('[^n]: first');
    expect(output.join('\n')).toContain('[^m]: back');
    expect(output.join('\n')).not.toContain('ignored');
    expect(output.join('\n').match(/\[\^n\]:/g)).toHaveLength(1);
  });

  it('preserves first definitions and image metadata across markers', () => {
    expect(
      printed(
        '[d] ![alt][img]\n\n<render_attachment id=x />\n\n[d]: https://elastic.co "first"\n[d]: https://ignored.example\n[img]: https://elastic.co/image.png "image title"'
      ).join('\n')
    ).toContain('![alt](https://elastic.co/image.png "image title")');
    expect(
      printed(
        '[d]\n\n<render_attachment id=x />\n\n[d]: https://elastic.co\n[d]: https://ignored.example'
      ).join('\n')
    ).not.toContain('ignored.example');
  });

  it('returns frozen, reusable document views and readable fallback text', () => {
    const document = parse('1. a <render_attachment id=x />\n2. b');
    const renderers = {
      markdown: (_content: unknown, value: string) => value,
      element: () => 'attachment',
    };
    expect(renderAuthoredMarkdown(document, renderers)).toEqual([
      '1. a \n2. b',
      'attachment',
    ]);
    renderAuthoredMarkdown(document, {
      markdown: (content) => {
        expect(Object.isFrozen(content)).toBe(true);
        return '';
      },
      element: () => '',
    });
    expect(Object.isFrozen(document.elements[0]?.attributes)).toBe(true);
    expect(renderAuthoredMarkdown(document, renderers)).toEqual([
      '1. a \n2. b',
      'attachment',
    ]);
  });

  it('degrades the complete document when repeated references exceed the representation budget', () => {
    const document = parse(
      `${'[d] '.repeat(450)}\n\n<render_attachment id=x />\n\n[d]: https://elastic.co/${'x'.repeat(4000)}`
    );
    expect(document.inert).toBe(true);
    expect(document.elements).toHaveLength(1);
    expect(
      renderAuthoredMarkdown(document, {
        markdown: markdownContentToSlackBlocks,
        element: () => [],
      })
        .flat()
        .some((block) => JSON.stringify(block).includes('"type":"link"'))
    ).toBe(false);
  });

  it.each([
    '<render_attachment id="unfinished',
    '<render_attachmentish id=x />',
    '</render_attachment>',
    '<render_attachment id=x\n/>',
  ])('leaves unsupported or incomplete markers literal: %s', (source) => {
    expect(parse(source).elements).toEqual([]);
  });

  it('reads bare, quoted, unquoted and adjacent markers in order', () => {
    const document = parse(
      '<render_attachment id=x><render_attachment id=\'y\' /><render_attachment\tid="z>!"/>'
    );
    expect(document.elements.map(({ attributes }) => attributes.id)).toEqual([
      'x',
      'y',
      'z>!',
    ]);
  });

  it('bounds failed candidate scans and large inert scans', () => {
    const started = performance.now();
    const near = parse('<render_attachment '.repeat(500));
    const far = parse(`${'x'.repeat(900_000)}<render_attachment id=x />`);
    const tags = parse(
      `${'<other>'.repeat(15_000)}${'<render_attachment id=x>'.repeat(15_000)}${'</missing>'.repeat(15_000)}`
    );
    expect(near.inert).toBe(true);
    expect(far.inert).toBe(true);
    expect(far.elements).toHaveLength(1);
    expect(tags.elements).toHaveLength(15_000);
    expect(performance.now() - started).toBeLessThan(5000);
  });
});
