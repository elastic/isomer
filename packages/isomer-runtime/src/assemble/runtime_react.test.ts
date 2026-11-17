/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  type Composition,
  definePrimitive,
  definePrimitivePack,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { createIsomerRuntime } from './index';
import {
  boldPrimitive,
  type NoteNode,
  notePrimitive,
  packOf,
  view,
  type WrapNode,
  wrapPrimitive,
} from './runtime.fixtures';

describe('createIsomerRuntime', () => {
  it('renders a nested node owned by another pack', () => {
    const runtime = createIsomerRuntime({
      packs: [
        definePrimitivePack({
          id: 'test.wrap',
          surfaces: [],
          primitives: [wrapPrimitive],
        }),
        definePrimitivePack({
          id: 'test.bold',
          surfaces: [],
          primitives: [boldPrimitive],
        }),
      ],
    });
    const mixed: Composition = {
      type: 'view',
      body: [
        {
          type: 'wrap',
          items: [{ type: 'bold', text: 'nested' }],
        } as WrapNode,
      ],
    };

    expect(runtime.validate(mixed)).toMatchObject({ valid: true });
    expect(runtime.surfaces.text.render(mixed)).toBe('nested');
    expect(
      renderToStaticMarkup(runtime.surfaces.react.render(mixed))
    ).toContain('<strong>nested</strong>');
    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.renderNode(mixed.body[0] as WrapNode)
      )
    ).toContain('<strong>nested</strong>');
  });

  it('react surface returns bare content without wrapper options', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const markup = renderToStaticMarkup(
      runtime.surfaces.react.render(view('Bare'))
    );
    expect(markup).not.toContain('isomer');
  });

  it('react surface wraps content in the same section html emits, on request', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const markup = renderToStaticMarkup(
      runtime.surfaces.react.render(view('Wrapped'), {
        wrapper: { fluid: true },
      })
    );
    expect(markup).toContain('class="isomer framed fluid"');
    expect(markup).toContain('role="group"');

    const unframed = renderToStaticMarkup(
      runtime.surfaces.react.render(view('Unframed'), {
        wrapper: { framed: false, theme: 'dark' },
      })
    );
    expect(unframed).toContain('class="isomer"');
    expect(unframed).toContain('data-theme="dark"');

    const defaults = renderToStaticMarkup(
      runtime.surfaces.react.render(view('Defaults'), { wrapper: true })
    );
    expect(defaults).toContain('class="isomer framed"');
    expect(defaults).not.toContain('data-theme');
  });

  it('react surface wrapper falls back to the runtime default aria-label', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      defaultAriaLabel: 'Host view',
    });

    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.render(view('Labelled'), { wrapper: true })
      )
    ).toContain('aria-label="Host view"');
    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.renderNode(
          { type: 'note', text: 'Node' } as NoteNode,
          { wrapper: true }
        )
      )
    ).toContain('aria-label="Host view"');
    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.render(view('Overridden'), {
          wrapper: { defaultAriaLabel: 'Per render' },
        })
      )
    ).toContain('aria-label="Per render"');
  });

  it('react surface hands its context to a renderer', () => {
    interface GreetingContext {
      greeting: string;
    }
    const greetingNote = definePrimitive<NoteNode>({
      type: 'note',
      catalog: notePrimitive.catalog,
      examples: notePrimitive.examples,
      schema: notePrimitive.schema,
      renderers: {
        ...notePrimitive.renderers,
        react: (node, { context }) =>
          createElement(
            'span',
            null,
            `${(context as GreetingContext).greeting}, ${node.text}`
          ),
      },
    });
    const runtime = createIsomerRuntime<unknown, GreetingContext>({
      packs: [packOf(greetingNote)],
    });

    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.render(view('world'), {
          context: { greeting: 'Hello' },
        })
      )
    ).toContain('Hello, world');
    expect(
      renderToStaticMarkup(
        runtime.surfaces.react.renderNode(
          { type: 'note', text: 'node' } as NoteNode,
          { context: { greeting: 'Hi' } }
        )
      )
    ).toContain('Hi, node');
  });
});
