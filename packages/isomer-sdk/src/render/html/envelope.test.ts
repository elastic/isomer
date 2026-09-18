/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { Composition } from '../../composition/composition';
import {
  definePrimitive,
  type PrimitiveNode,
  type PrimitiveRenderContext,
  type PrimitiveStyleCollector,
} from '../../define/primitive_module';
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
const valid = () => ({ valid: true, errors: [], warnings: [] });
const invalid = () => ({
  valid: false,
  errors: [{ path: 'body[0]', message: 'is broken' }],
  warnings: [],
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
    const js = byteLength('adapter()');
    expect(inline.measurement).toEqual({
      html: byteLength(inline.html) - css - js,
      css,
      js,
      total: byteLength(inline.html),
    });

    const separate = render(
      view('<p>x</p>'),
      { css: 'separate' },
      { styleAdapter: adapter }
    );
    expect(separate.measurement.html).toBe(byteLength(separate.html) - js);
    expect(separate.measurement.total).toBe(
      byteLength(separate.html) + byteLength(separate.css)
    );
  });

  it('joins the caller script ahead of the adapter script in one script element', () => {
    const { html } = render(
      view('<p>x</p>'),
      {},
      { styleAdapter: adapter, scriptText: 'host()' }
    );
    expect(html.match(/<script>/g)).toHaveLength(1);
    expect(html).toContain('<script>host()\nadapter()</script>');
    expect(render(view('<p>x</p>')).html).not.toContain('<script>');
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
});
