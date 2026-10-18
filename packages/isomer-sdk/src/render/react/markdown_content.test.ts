/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { MarkdownContent } from '../../define/markdown_content';
import { md } from '../markdown/builder';
import { SAFE_INPUTS } from '../markdown/safe_inputs.fixtures';

import { renderMarkdownContent } from './markdown_content';

const html = (content: MarkdownContent): string =>
  renderToStaticMarkup(renderMarkdownContent(content));

describe('renderMarkdownContent', () => {
  it('renders builder blocks', () => {
    expect(
      html([
        md.heading(2, 'Title'),
        md.paragraph(
          md.strong('bold'),
          ' ',
          md.emphasis('em'),
          ' ',
          md.code('x'),
          ' ',
          md.link('docs', 'https://a.b/c')
        ),
        md.list(['one', 'two']),
        md.list(['a', 'b'], { ordered: true, start: 3 }),
        md.blockquote(md.paragraph('quoted')),
        md.codeBlock('const a = 1;', 'ts'),
        md.table(['A', 'B'], [['1', '2']]),
      ])
    ).toBe(
      '<h2>Title</h2>' +
        '<p><strong>bold</strong> <em>em</em> <code>x</code> <a href="https://a.b/c">docs</a></p>' +
        '<ul><li>one</li><li>two</li></ul>' +
        '<ol start="3"><li>a</li><li>b</li></ol>' +
        '<blockquote><p>quoted</p></blockquote>' +
        '<pre><code class="language-ts">const a = 1;</code></pre>' +
        '<table><thead><tr><th>A</th><th>B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>'
    );
  });

  it('renders authored source from its GFM parse', () => {
    expect(
      html(
        md.authored(
          [
            '# Heading',
            '',
            'A **bold** and ~~struck~~ [link](https://a.b "t") with `code`.',
            '',
            '- [x] done',
            '- [ ] todo',
            '',
            '| L | R |',
            '| :- | -: |',
            '| 1 | 2 |',
            '',
            '---',
            '',
            '```js',
            'run();',
            '```',
          ].join('\n')
        )
      )
    ).toBe(
      '<h1>Heading</h1>' +
        '<p>A <strong>bold</strong> and <del>struck</del> <a href="https://a.b" title="t">link</a> with <code>code</code>.</p>' +
        '<ul><li><input type="checkbox" disabled="" readonly="" checked=""/> done</li><li><input type="checkbox" disabled="" readonly=""/> todo</li></ul>' +
        '<table><thead><tr><th style="text-align:left">L</th><th style="text-align:right">R</th></tr></thead><tbody><tr><td style="text-align:left">1</td><td style="text-align:right">2</td></tr></tbody></table>' +
        '<hr/>' +
        '<pre><code class="language-js">run();</code></pre>'
    );
  });

  it('resolves reference links and images', () => {
    expect(
      html(
        md.authored(
          '[docs][d] ![alt][i]\n\n[d]: https://a.b/docs\n[i]: https://a.b/i.png'
        )
      )
    ).toBe(
      '<p><a href="https://a.b/docs">docs</a> <img src="https://a.b/i.png" alt="alt"/></p>'
    );
  });

  it('keeps definition titles on resolved links and images', () => {
    expect(
      html(md.authored('[docs][d] ![alt][d]\n\n[d]: https://a.b/x.png "Help"'))
    ).toBe(
      '<p><a href="https://a.b/x.png" title="Help">docs</a> <img src="https://a.b/x.png" alt="alt" title="Help"/></p>'
    );
  });

  it('keeps a destination as parsed, without decoding it again', () => {
    expect(
      html(
        md.authored(
          '[x](https://a.test/?q=&amp;lt;) ![y](https://a.test/i.png?q=&amp;lt;)'
        )
      )
    ).toBe(
      '<p><a href="https://a.test/?q=&amp;lt;">x</a> <img src="https://a.test/i.png?q=&amp;lt;" alt="y"/></p>'
    );
  });

  it('keeps separate paragraphs in a list item apart', () => {
    expect(
      html([
        md.list([[md.paragraph('first'), md.paragraph('second')]]),
        md.authored('- first\n\n  second\n- tight'),
      ])
    ).toBe(
      '<ul><li><p>first</p><p>second</p></li></ul>' +
        '<ul><li><p>first</p><p>second</p></li><li><p>tight</p></li></ul>'
    );
  });

  it('degrades blocked links and images as `md` does', () => {
    expect(
      html([
        md.paragraph(md.link('label', 'javascript:alert(1)')),
        md.paragraph(md.image('alt', 'javascript:alert(1)')),
      ])
    ).toBe('<p><a href="#">label</a></p><p>alt</p>');
    expect(
      html(md.authored('[x](javascript:alert(1)) ![y](data:text/html,z)'))
    ).toBe('<p>x y</p>');
  });

  it('applies the URL policy to nodes built outside `md`', () => {
    const raw = {
      [Symbol.for('elastic.isomer.markdown_content')]: 'block',
      type: 'paragraph',
      children: [
        {
          type: 'link',
          url: 'javascript:alert(1)',
          children: [{ type: 'text', value: 'x' }],
        },
        { type: 'image', url: 'javascript:alert(1)', alt: 'y' },
      ],
    } as unknown as MarkdownContent;
    expect(html(raw)).toBe('<p><a href="#">x</a>y</p>');
  });

  it('keeps source past the parse budget as literal paragraphs', () => {
    const source = `*${'x'.repeat(20_000)}*\n\n<b>next</b>`;
    const out = html(md.authored(source));
    expect(out).not.toContain('<em>');
    expect(out).not.toContain('<b>');
    expect(out).toContain('&lt;b&gt;next&lt;/b&gt;');
  });

  it('renders no markup from text that must stay text', () => {
    for (const input of SAFE_INPUTS) {
      const out = html(md.paragraph(input));
      expect(out).not.toMatch(
        /<(?:a|img|b|em|strong|del|h\d|ul|ol|li|blockquote|pre|table|hr)[\s>/]/
      );
    }
  });

  it('renders footnotes as labelled text', () => {
    expect(html(md.authored('Text[^1].\n\n[^1]: Note.'))).toBe(
      '<p>Text[^1].</p><p>[^1]: Note.</p>'
    );
  });

  it('renders nothing for empty content', () => {
    expect(html(md.authored('  '))).toBe('');
    expect(html([])).toBe('');
  });
});
