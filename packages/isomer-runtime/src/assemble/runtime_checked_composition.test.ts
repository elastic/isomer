/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { type Composition, type PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { defineView } from '../registry';

import { createIsomerRuntime } from './index';
import {
  drawingRuntime,
  type NoteNode,
  notePrimitive,
  packOf,
  view,
} from './runtime.fixtures';

describe('the checked composition', () => {
  /** A note whose `text` reads `safe` once, through either trap, and `UNSAFE` after. */
  const shifty = () => {
    let reads = 0;
    const text = () => (reads++ === 0 ? 'safe' : 'UNSAFE');
    const node = new Proxy<NoteNode>(
      { type: 'note', text: 'safe' },
      {
        get: (target, key, receiver): unknown =>
          key === 'text' ? text() : Reflect.get(target, key, receiver),
        getOwnPropertyDescriptor: (target, key) => {
          const descriptor = Reflect.getOwnPropertyDescriptor(target, key);
          return key === 'text' && descriptor
            ? { ...descriptor, value: text() }
            : descriptor;
        },
      }
    );
    const composition: Composition = { type: 'view', body: [node] };
    return { composition, reads: () => reads };
  };

  it('renders what validation checked on every validating surface, reading the input once', () => {
    const { html, text, markdown, slack, snapshot } =
      drawingRuntime(notePrimitive).surfaces;
    const renders: ((composition: Composition) => string)[] = [
      (composition) => html.render(composition).html,
      (composition) => text.render(composition),
      (composition) => markdown.render(composition),
      (composition) => JSON.stringify(slack.render(composition)),
      (composition) =>
        renderToStaticMarkup(snapshot.render(composition).element),
    ];
    for (const render of renders) {
      const { composition, reads } = shifty();
      const output = render(composition);
      expect(output).toContain('safe');
      expect(output).not.toContain('UNSAFE');
      expect(reads()).toBe(1);
    }
    const pages = [shifty(), shifty()];
    const document = snapshot.renderPages(
      pages.map(({ composition }) => composition)
    );
    const output = document.pages.map(({ html }) => html).join('');
    expect(output).not.toContain('UNSAFE');
    expect(pages.map(({ reads }) => reads())).toEqual([1, 1]);
  });

  it('renders what validation checked on every validating surface’s renderNode, reading the node once', () => {
    const { html, text, markdown, slack, snapshot } =
      drawingRuntime(notePrimitive).surfaces;
    const renders: ((node: PrimitiveNode) => string)[] = [
      (node) => html.renderNode(node).html,
      (node) => text.renderNode(node),
      (node) => markdown.renderNode(node),
      (node) => JSON.stringify(slack.renderNode(node)),
      (node) => renderToStaticMarkup(snapshot.renderNode(node).element),
    ];
    for (const render of renders) {
      const {
        composition: {
          body: [node],
        },
        reads,
      } = shifty();
      if (node === undefined) {
        throw new Error('expected a node');
      }
      const output = render(node);
      expect(output).toContain('safe');
      expect(output).not.toContain('UNSAFE');
      expect(reads()).toBe(1);
    }
  });

  it('throws on an invalid node by default and renders it with collect', () => {
    const { text } = drawingRuntime(notePrimitive).surfaces;
    const invalid = { type: 'note' } as unknown as NoteNode;
    expect(() => text.renderNode(invalid)).toThrow(
      expect.objectContaining({ name: 'CompositionValidationError' })
    );
    expect(() =>
      text.renderNode(invalid, { onValidationError: 'collect' })
    ).not.toThrow();
  });

  it('returns the copy from validate and from a view request', async () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      views: [
        defineView({
          id: 'test.shifty',
          title: 'Shifty',
          answers: [],
          build: () => shifty().composition,
        }),
      ],
    });
    expect(runtime.validate(shifty().composition).composition).toEqual(
      view('safe')
    );
    const { composition } = await runtime.viewRegistry.request(
      'test.shifty',
      undefined
    );
    expect(composition).toEqual(view('safe'));
    expect(runtime.surfaces.text.render(composition)).toBe('safe');
  });

  it('leaves plain input as it was, drawn from a copy', async () => {
    const built = view('plain');
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      views: [
        defineView({
          id: 'test.plain',
          title: 'Plain',
          answers: [],
          build: () => built,
        }),
      ],
    });
    const { composition, validation } = await runtime.viewRegistry.request(
      'test.plain',
      undefined
    );
    expect(composition).toEqual(built);
    expect(composition).not.toBe(built);
    expect(validation).toEqual({ valid: true, errors: [], warnings: [] });
  });
});
