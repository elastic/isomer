/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Script } from 'node:vm';

import { createElement } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { Composition } from '../../composition/composition';
import {
  definePrimitive,
  type PrimitiveNode,
  type PrimitiveRenderContext,
  type PrimitiveStyleCollector,
} from '../../define/primitive_module';
import type { CheckedComposition } from '../../validate/validation';
import { byteLength } from '../payload';
import { createPrimitiveDispatcher } from '../primitive_dispatch';

import {
  type HTMLRenderOptions,
  type HTMLStyleAdapter,
  renderHTMLWithDispatcher,
} from './envelope';

interface RawNode extends PrimitiveNode {
  type: 'raw';
  html: string;
}

const raw = definePrimitive<RawNode>({
  type: 'raw',
  catalog: {
    type: 'raw',
    purpose: 'raw',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'raw', html: '<p>x</p>' },
  },
  examples: [{ type: 'raw', html: '<p>x</p>' }],
  schema: z.object({ type: z.literal('raw'), html: z.string() }),
  renderers: {
    react: (node) =>
      createElement('div', { dangerouslySetInnerHTML: { __html: node.html } }),
    text: (node) => node.html,
    markdown: (node) => node.html,
  },
});

const dispatcher = createPrimitiveDispatcher<RawNode>([raw]);
const valid = <TNode extends PrimitiveNode>(
  composition: Composition<TNode>
) => ({
  valid: true,
  errors: [],
  warnings: [],
  composition: composition as CheckedComposition<TNode>,
});
const invalid = <TNode extends PrimitiveNode>(
  composition: Composition<TNode>
) => ({
  ...valid(composition),
  valid: false,
  errors: [{ path: 'body[0]', message: 'is broken' }],
});

const view = (html: string, extra: Partial<Composition<RawNode>> = {}) => ({
  type: 'view' as const,
  title: 'Checkout',
  body: [{ type: 'raw' as const, html }],
  ...extra,
});

interface Collector extends PrimitiveStyleCollector {
  rules: string[];
}

const adapter: HTMLStyleAdapter<RawNode, Collector, PrimitiveRenderContext> = {
  createCollector: () => ({ rules: [] }),
  collectWrapperStyles: (collector) => {
    collector.rules.push('.isomer{color:red}');
  },
  createRenderContext: () => ({}),
  renderStyles: (collector) => collector.rules.join(''),
  getScriptText: () => 'adapter()',
};

const embeddedScriptOf = (html: string): string =>
  /<script[^>]*>([\s\S]*)<\/script>/.exec(html)?.[1] ?? '';

const render = (
  composition: Composition<RawNode>,
  options: HTMLRenderOptions = {},
  extra: Partial<Parameters<typeof renderHTMLWithDispatcher>[1]> = {}
) =>
  renderHTMLWithDispatcher(composition, {
    dispatcher,
    validate: valid,
    options,
    ...extra,
  });

describe('renderHTMLWithDispatcher enhancements', () => {
  interface ProbeNode extends PrimitiveNode {
    type: 'probe';
  }
  const probe = definePrimitive<ProbeNode>({
    type: 'probe',
    catalog: {
      type: 'probe',
      purpose: 'probe',
      useWhen: [],
      avoidWhen: [],
      example: { type: 'probe' },
    },
    examples: [{ type: 'probe' }],
    schema: z.object({ type: z.literal('probe') }),
    renderers: {
      react: (_node, { context }) =>
        createElement(
          'i',
          null,
          [
            ...((context as { enhancements?: Set<string> }).enhancements ?? []),
          ].join(',') || 'none'
        ),
      text: () => '',
      markdown: () => '',
    },
  });
  const sorter = {
    id: 'sort',
    appliesTo: () => true,
    script: 'sorted()',
  };
  const renderProbe = (options: HTMLRenderOptions) =>
    renderHTMLWithDispatcher<ProbeNode>(
      { type: 'view', body: [{ type: 'probe' }] },
      {
        dispatcher: createPrimitiveDispatcher<ProbeNode>([probe]),
        validate: valid,
        options,
        enhancementDefinitions: [sorter],
      }
    );

  it('applies none when the host requests none, even if one applies', () => {
    const { html, js } = renderProbe({});
    expect(js).toBe('');
    expect(html).toContain('<i>none</i>');
  });

  it('applies a requested one that applies', () => {
    const { html, js } = renderProbe({ enhancements: ['sort'] });
    expect(js).toContain('sorted()');
    expect(html).toContain('<i>sort</i>');
  });
});

describe('renderHTMLWithDispatcher', () => {
  it('wraps the body in a div inside the section, with a heading by default', () => {
    const { html, body, css } = render(view('<p>x</p>'));
    expect(html).toBe(
      '<section class="isomer framed" role="group" aria-label="Checkout"><div><h2>Checkout</h2><div><p>x</p></div></div></section>'
    );
    expect(body).toBe('<h2>Checkout</h2><div><p>x</p></div>');
    expect(css).toBe('');
  });

  it('omits the heading when asked, keeping the title as the label', () => {
    const { html } = render(view('<p>x</p>'), { heading: false });
    expect(html).not.toContain('<h2>');
    expect(html).toContain('aria-label="Checkout"');
  });

  it('inlines the stylesheet by default and moves it to css when separate', () => {
    const inline = render(view('<p>x</p>'), {}, { styleAdapter: adapter });
    expect(inline.html).toContain('<style>.isomer{color:red}</style>');
    expect(inline.css).toBe('.isomer{color:red}');

    const separate = render(
      view('<p>x</p>'),
      { css: 'separate' },
      { styleAdapter: adapter }
    );
    expect(separate.html).not.toContain('<style>');
    expect(separate.css).toBe('.isomer{color:red}');
  });

  it('accounts for html, css, and js bytes in the measurement', () => {
    const inline = render(view('<p>x</p>'), {}, { styleAdapter: adapter });
    const css = byteLength(inline.css);
    const js = byteLength(embeddedScriptOf(inline.html));
    expect(inline.measurement).toEqual({
      html: byteLength(inline.html) - css - js,
      css,
      js,
      total: byteLength(inline.html),
    });

    const separate = render(
      view('<p>x</p>'),
      { css: 'separate', scripts: 'host' },
      { styleAdapter: adapter }
    );
    expect(separate.measurement).toEqual({
      html: byteLength(separate.html),
      css,
      js: byteLength(separate.js),
      total:
        byteLength(separate.html) +
        byteLength(separate.css) +
        byteLength(separate.js),
    });
  });

  it('embeds one script that binds root to the section, scoping each part', () => {
    const { html, js } = render(
      view('<p>x</p>'),
      {},
      { styleAdapter: adapter, scriptText: 'host()' }
    );
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html).toMatch(/<\/div><script data-isomer-script="">/);
    expect(js).toBe('(() => {\nhost()\n})();\n(() => {\nadapter()\n})();');

    const script = embeddedScriptOf(html);
    expect(script.match(/document\.currentScript/g)).toHaveLength(2);
    expect(script.match(/function \(root\)/g)).toHaveLength(1);
    expect(script).toContain(js);
    expect(render(view('<p>x</p>')).html).not.toContain('<script');
  });

  it('runs the embedded script against its parent and warns when it has none', () => {
    const { html } = render(
      view('<p>x</p>'),
      {},
      { scriptText: 'root.ran = true;' }
    );
    // eslint-disable-next-line @typescript-eslint/no-implied-eval -- runs the emitted script as a browser would.
    const run = new Function('document', embeddedScriptOf(html)) as (
      document: unknown
    ) => void;
    const section: { ran?: boolean } = {};
    run({ currentScript: { parentElement: section } });
    expect(section.ran).toBe(true);

    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    try {
      run({ currentScript: null });
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("scripts: 'host'")
      );
    } finally {
      warn.mockRestore();
    }
  });

  it('returns the script as js and emits no script element for a host-run render', () => {
    const { html, js } = render(
      view('<p>x</p>'),
      { scripts: 'host' },
      { styleAdapter: adapter }
    );
    expect(html).not.toContain('<script');
    expect(js).toBe('(() => {\nadapter()\n})();');
    expect(render(view('<p>x</p>'), { scripts: 'host' }).js).toBe('');
  });

  it('collects validation errors by default and throws on demand', () => {
    const collected = render(view('<p>x</p>'), {}, { validate: invalid });
    expect(collected.validationErrors).toEqual([
      { path: 'body[0]', message: 'is broken' },
    ]);
    expect(collected.html).toContain('<section');

    let thrown: unknown;
    try {
      render(
        view('<p>x</p>'),
        { onValidationError: 'throw' },
        { validate: invalid }
      );
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toMatchObject({
      name: 'CompositionValidationError',
      code: 'COMPOSITION_INVALID',
      errors: [{ path: 'body[0]', message: 'is broken' }],
    });
  });

  it('validates against the dispatcher definitions when validate is omitted', () => {
    expect(
      renderHTMLWithDispatcher(view('<p>x</p>'), { dispatcher })
        .validationErrors
    ).toEqual([]);
    const broken = {
      type: 'view',
      body: [{ type: 'raw', html: 1 }],
    } as unknown as Composition<RawNode>;
    const { validationErrors } = renderHTMLWithDispatcher(broken, {
      dispatcher,
    });
    expect(validationErrors.map(({ path }) => path)).toEqual(['body[0].html']);
  });

  it('draws the composition validate returns, never its input', () => {
    const seen: unknown[] = [];
    const { html } = render(
      view('<p>input</p>'),
      {},
      {
        validate: () => valid(view('<p>checked</p>', { title: 'Checked' })),
        styleAdapter: {
          ...adapter,
          resolveOptions: (composition, options) => {
            seen.push(composition.title);
            return options;
          },
        },
      }
    );
    expect(html).toContain('<p>checked</p>');
    expect(html).toContain('Checked');
    expect(html).not.toContain('input');
    expect(seen).toEqual(['Checked']);
  });

  it('reads a proxy once by default, so a second read cannot change what is drawn', () => {
    let reads = 0;
    const input = new Proxy(view('<p>x</p>'), {
      get: (target, key, receiver): unknown =>
        key === 'title'
          ? reads++ === 0
            ? 'Safe'
            : 'UNSAFE'
          : Reflect.get(target, key, receiver),
      getOwnPropertyDescriptor: (target, key) => {
        const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
        return key === 'title' && descriptor
          ? { ...descriptor, value: reads++ === 0 ? 'Safe' : 'UNSAFE' }
          : descriptor;
      },
    });
    const { html } = renderHTMLWithDispatcher(input, { dispatcher });
    expect(html).toContain('Safe');
    expect(html).not.toContain('UNSAFE');
    expect(reads).toBe(1);
  });

  it('sets data-theme from the option, then the composition, and not for auto', () => {
    expect(render(view('<p>x</p>')).html).not.toContain('data-theme');
    expect(render(view('<p>x</p>', { theme: 'dark' })).html).toContain(
      'data-theme="dark"'
    );
    expect(
      render(view('<p>x</p>', { theme: 'dark' }), { theme: 'light' }).html
    ).toContain('data-theme="light"');
  });

  it('collapses only whitespace that spans a line break, leaving pre content alone', () => {
    const authored =
      '<p>a</p>\n  <p>b</p><b>a</b> <i>b</i><pre>x\n  <span>y</span></pre>';
    const { html } = render(view(authored));
    expect(html).toContain(
      '<p>a</p><p>b</p><b>a</b> <i>b</i><pre>x\n  <span>y</span></pre>'
    );
    expect(render(view(authored), { minify: false }).html).toContain(authored);
  });

  it('keeps inline style and script text from closing its element', () => {
    const hostile: typeof adapter = {
      ...adapter,
      renderStyles: () => '.a{content:"</style><img src=x onerror=alert(1)>"}',
      getScriptText: () => 'const s = "</script><img src=x>"; // <!--',
    };
    const { html, css } = render(
      view('<p>x</p>'),
      {},
      { styleAdapter: hostile }
    );
    expect(html.match(/<\/style/gi)).toHaveLength(1);
    expect(html.match(/<\/script/gi)).toHaveLength(1);
    expect(html).not.toContain('<!--');
    expect(css).toContain('</style>');
    expect(
      render(view('<p>x</p>'), { scripts: 'host' }, { styleAdapter: hostile })
        .js
    ).toContain('</script>');
  });

  it('leaves other less-than sequences in a script as written', () => {
    const source = "x.replace(/</g, '&lt;'); y = '</div>';";
    const { html } = render(
      view('<p>x</p>'),
      {},
      { styleAdapter: { ...adapter, getScriptText: () => source } }
    );
    const script = embeddedScriptOf(html);
    expect(script).toContain(source);
    expect(() => new Script(script)).not.toThrow();
  });

  it('keeps an escaped script compiling to the same values', () => {
    const source = [
      "globalThis.out = [/<!--/u.test('<!--'), /<\\/script>/u.source,",
      "'</script>', `</SCRIPT>`, '<!-- x -->', '\\<!--', /\\<!--/.test('<!--'),",
      "'\\\\<!--'];",
    ].join(' ');
    const { html } = render(
      view('<p>x</p>'),
      {},
      { styleAdapter: { ...adapter, getScriptText: () => source } }
    );
    const script = embeddedScriptOf(html);
    expect(script).not.toMatch(/<\/script|<!--/i);
    const run = (code: string) => {
      const context: { out?: unknown } = {};
      new Script(code).runInNewContext({ globalThis: context });
      return context.out;
    };
    expect(run(source)).toEqual(
      run(script.slice(script.indexOf('globalThis.out')).split('\n')[0]!)
    );
  });

  it('preserves raw tagged templates, receivers, site identity and HTML comments', () => {
    const source = [
      '<!-- legacy script comment',
      'globalThis.out = [];',
      'const receiver = {tag(parts, value) {',
      'globalThis.out.push([this === receiver, parts[0], parts.raw[0], value, Object.isFrozen(parts), Object.isFrozen(parts.raw)]);',
      'globalThis.same = !globalThis.previous || globalThis.previous === parts;',
      'globalThis.previous = parts; return value; }};',
      'for (let i = 0; i < 2; i++) receiver.tag`</script><!--${String.raw`</SCRIPT><!--`}`;',
      'globalThis.out.push(String.raw`\\<!--`);',
      '--> legacy closing comment',
    ].join('\n');
    const { html } = render(
      view('<p>x</p>'),
      {},
      {
        styleAdapter: { ...adapter, getScriptText: () => source },
      }
    );
    const script = embeddedScriptOf(html);
    expect(script).not.toMatch(/<\/script|<!--/i);
    const run = (code: string) => {
      const context: { out?: unknown; same?: boolean } = {};
      new Script(code).runInNewContext({
        globalThis: context,
        document: { currentScript: { parentElement: {} } },
      });
      return [context.out, context.same];
    };
    expect(run(script)).toEqual(run(source));
    expect(run(script)[1]).toBe(true);
  });

  it('escapes only a closing style tag in inline CSS', () => {
    const css = '<!-- .a{content:"</STYLE>"} -->';
    const { html } = render(
      view('<p>x</p>'),
      {},
      { styleAdapter: { ...adapter, renderStyles: () => css } }
    );
    expect(html).toContain(
      String.raw`<style><!-- .a{content:"<\/STYLE>"} --></style>`
    );
  });

  it('measures inline CSS and JS as emitted, escapes included', () => {
    const { html, measurement } = render(
      view('<p>x</p>'),
      {},
      {
        styleAdapter: {
          ...adapter,
          renderStyles: () => '.a{content:"</style>"}',
          getScriptText: () => "s = '</script>';",
        },
      }
    );
    const css = /<style>([\s\S]*)<\/style>/.exec(html)?.[1] ?? '';
    expect(measurement.css).toBe(byteLength(css));
    expect(measurement.js).toBe(byteLength(embeddedScriptOf(html)));
    expect(measurement.html + measurement.css + measurement.js).toBe(
      byteLength(html)
    );
  });

  it('protects a raw-text element whose closing tag holds whitespace', () => {
    const authored = '<textarea>a>\n <b</textarea >\n<p>c</p>';
    expect(render(view(authored)).html).toContain(
      '<textarea>a>\n <b</textarea ><p>c</p>'
    );
  });

  it('leaves whitespace inside script, style, and textarea alone', () => {
    const authored = '<textarea>a\n  b</textarea>\n<p>c</p>';
    expect(render(view(authored)).html).toContain(
      '<textarea>a\n  b</textarea><p>c</p>'
    );
    const scripted = render(
      view('<p>x</p>'),
      {},
      {
        styleAdapter: {
          ...adapter,
          renderStyles: () => '.a{}\n  <b>',
          getScriptText: () => 'a = "x>\n  <y";',
        },
      }
    ).html;
    expect(scripted).toContain('.a{}\n  <b>');
    expect(scripted).toContain('a = "x>\n  <y";');
  });

  it('collapses a long whitespace run between tags in linear time', () => {
    const started = performance.now();
    render(view(`<p>${'\n '.repeat(50_000)}x</p>`));
    expect(performance.now() - started).toBeLessThan(1_000);
  });

  it('minifies unclosed raw-text openers in linear time', () => {
    const started = performance.now();
    const { html } = render(view(`<p>a</p>\n${'<textarea '.repeat(20_000)}`));
    expect(performance.now() - started).toBeLessThan(1_000);
    expect(html).toContain('<p>a</p><textarea');
  });
});
