/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { definePrimitive } from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { z } from 'zod';

import { createIsomerRuntime } from './index';
import {
  type BoldNode,
  boldPrimitive,
  type NoteNode,
  notePrimitive,
  packOf,
  snapshotPackOf,
  testFrame,
  view,
} from './runtime.fixtures';

describe('createIsomerRuntime', () => {
  it('applies renderer overrides to registered primitive types', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      rendererOverrides: {
        note: {
          text: (node: NoteNode) => `override:${node.text}`,
        },
      },
    });

    expect(runtime.surfaces.text.render(view('ok'))).toBe('override:ok');
  });

  it('applies a markdown override built with md to markdown and the Slack fallback', () => {
    const fallbackNote = definePrimitive<NoteNode>({
      type: 'note',
      catalog: {
        type: 'note',
        purpose: 'Render a note through the markdown fallback.',
        useWhen: [],
        avoidWhen: [],
        example: { type: 'note', text: 'Hello' },
      },
      examples: [{ type: 'note', text: 'Hello' }],
      schema: z.object({ type: z.literal('note'), text: z.string().min(1) }),
      renderers: {
        react: () => null,
        text: (node) => node.text,
        markdown: (node) => md.paragraph(node.text),
      },
    });
    const runtime = createIsomerRuntime({
      packs: [packOf(fallbackNote)],
      rendererOverrides: {
        note: {
          markdown: (node: NoteNode) =>
            md.paragraph(md.strong(node.text), ' *literal*'),
        },
      },
    });

    expect(
      runtime.surfaces.markdown.render(view('a*b'), { heading: false })
    ).toBe('**a\\*b** \\*literal\\*');
    expect(
      runtime.surfaces.slack.render(view('a*b'), { heading: false }).blocks
    ).toContainEqual({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_section',
          elements: [
            { type: 'text', text: 'a*b', style: { bold: true } },
            { type: 'text', text: ' *literal*' },
          ],
        },
      ],
    });
  });

  // `react` serves the `snapshot` surface, so one override reaches both.
  it('accepts a react override that narrows the node type', () => {
    const runtime = createIsomerRuntime({
      packs: [snapshotPackOf(notePrimitive)],
      frames: { card: testFrame },
      rendererOverrides: {
        note: {
          react: (node: NoteNode) =>
            createElement('text', null, `svg:${node.text}`),
        },
      },
    });

    expectTypeOf(runtime.surfaces.snapshot).not.toEqualTypeOf<undefined>();
    expect(
      renderToStaticMarkup(runtime.surfaces.snapshot.render(view('ok')).element)
    ).toContain('svg:ok');
  });

  it('rejects renderer overrides for unknown primitive types', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [packOf(notePrimitive)],
        rendererOverrides: {
          missing: {
            text: () => 'unused',
          },
        },
      })
    ).toThrow(/unregistered primitive type "missing"/);
  });

  it('rejects renderer overrides for unknown surfaces', () => {
    expect(() =>
      createIsomerRuntime({
        packs: [packOf(notePrimitive)],
        rendererOverrides: {
          note: {
            // A typo in a surface key would otherwise merge silently.
            txt: () => 'unused',
          } as Record<string, unknown>,
        },
      })
    ).toThrow(/targets unknown surface "txt"/);
  });

  it('skips overrides for primitives the override map does not target', () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive, boldPrimitive)],
      rendererOverrides: {
        note: { text: (node: NoteNode) => `override:${node.text}` },
      },
    });

    expect(runtime.surfaces.text.render(view('ok'))).toBe('override:ok');
    expect(
      runtime.surfaces.text.render({
        type: 'view',
        body: [{ type: 'bold', text: 'untouched' } as BoldNode],
      })
    ).toBe('untouched');
  });
});
