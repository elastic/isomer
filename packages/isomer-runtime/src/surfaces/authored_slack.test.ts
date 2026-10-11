/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  definePrimitive,
  definePrimitivePack,
  type PrimitiveNode,
  z,
} from '@elastic/isomer-sdk';
import { md } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it, vi } from 'vitest';

import { createIsomerRuntime } from '../assemble/runtime';

interface Note extends PrimitiveNode {
  type: 'note';
  text: string;
}

const note = definePrimitive<Note>({
  type: 'note',
  schema: z.object({ type: z.literal('note'), text: z.string() }),
  catalog: {
    type: 'note',
    purpose: 'Show an attachment.',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'note', text: 'attachment' },
  },
  examples: [{ type: 'note', text: 'attachment' }],
  renderers: {
    react: () => null,
    text: ({ text }) => text,
    markdown: ({ text }) => md.codeBlock(text),
  },
});
const packs = [definePrimitivePack({ id: 'attachments', primitives: [note] })];
const attachment = (text: string) => ({
  type: 'view' as const,
  body: [{ type: 'note', text }],
});

describe('runtime authored Markdown to Slack', () => {
  it('keeps the list, resolves document references, and dispatches attachments', () => {
    const runtime = createIsomerRuntime({ packs });
    const resolveElement = vi.fn(() => attachment('attachment content'));
    const result = runtime.surfaces.slack.renderAuthoredMarkdown(
      '1. see [docs] <render_attachment id=x />\n2. next\n\n[docs]: https://elastic.co',
      {
        elements: ['render_attachment'],
        resolveElement,
      }
    );
    expect(result.inert).toBe(false);
    expect(result.elementErrors).toEqual([]);
    expect(resolveElement).toHaveBeenCalledTimes(1);
    expect(result.blocks[0]).toMatchObject({
      type: 'rich_text',
      elements: [
        {
          type: 'rich_text_list',
          style: 'ordered',
          elements: [
            {
              elements: [
                { text: 'see ' },
                { type: 'link', text: 'docs', url: 'https://elastic.co' },
                { text: ' ' },
              ],
            },
            { elements: [{ text: 'next' }] },
          ],
        },
      ],
    });
    expect(JSON.stringify(result.blocks)).toContain('attachment content');
    expect(result.text).toContain('https://elastic.co');
    expect(result.text).toContain('attachment content');
    expect(result.text).not.toContain('render_attachment');
  });

  it('validates mapping results and isolates mapping failures', () => {
    const runtime = createIsomerRuntime({ packs });
    const onElementError = vi.fn();
    const result = runtime.surfaces.slack.renderAuthoredMarkdown(
      'Before\n\n<render_attachment id=bad />\n\n<render_attachment id=throws />\n\n<render_attachment id=missing />\n\n<render_attachment id=good />\n\nAfter',
      {
        elements: ['render_attachment'],
        onElementError,
        resolveElement: ({ attributes }) => {
          if (attributes.id === 'bad') {
            return { type: 'view', body: [{ type: 'unknown' }] };
          }
          if (attributes.id === 'throws') {
            throw new Error('mapping failed');
          }
          if (attributes.id === 'missing') {
            return null;
          }
          return attachment('good attachment');
        },
      }
    );
    expect(result.elementErrors).toHaveLength(2);
    expect(onElementError).toHaveBeenCalledTimes(2);
    expect(result.text).toContain('Before');
    expect(result.text).toContain('After');
    expect(result.text).toContain('good attachment');
    expect(JSON.stringify(result.blocks)).not.toContain('unknown');
  });

  it('leaves examples literal and sanitizes unsafe links and HTML', () => {
    const runtime = createIsomerRuntime({ packs });
    const resolveElement = vi.fn(() => attachment('wrong'));
    const result = runtime.surfaces.slack.renderAuthoredMarkdown(
      '`<render_attachment id=x />`\n\n[bad](javascript:alert)\n\n<script>alert(1)</script>',
      { elements: ['render_attachment'], resolveElement }
    );
    expect(resolveElement).not.toHaveBeenCalled();
    expect(JSON.stringify(result.blocks)).toContain('render_attachment');
    expect(JSON.stringify(result.blocks)).toContain('alert(1)');
    expect(JSON.stringify(result.blocks)).not.toContain('"url":"javascript:');
  });

  it('preserves literal fallback text and still renders attachments over the parse budget', () => {
    const runtime = createIsomerRuntime({ packs });
    const result = runtime.surfaces.slack.renderAuthoredMarkdown(
      `${'[x]'.repeat(1100)}\n<render_attachment id=x />\nend`,
      {
        elements: ['render_attachment'],
        resolveElement: () => attachment('attachment content'),
      }
    );
    expect(result.inert).toBe(true);
    expect(result.text).toContain('[x][x]');
    expect(result.text).not.toContain('\\[');
    expect(result.text).toContain('attachment content');
    expect(JSON.stringify(result.blocks)).toContain('attachment content');
  });

  it('enforces the runtime input budget before invoking the host', () => {
    const runtime = createIsomerRuntime({
      packs,
      inputBudget: { characters: 64 },
    });
    const resolveElement = vi.fn(() => attachment('attachment'));
    expect(() =>
      runtime.surfaces.slack.renderAuthoredMarkdown('x'.repeat(65), {
        elements: ['render_attachment'],
        resolveElement,
      })
    ).toThrow('characters');
    expect(resolveElement).not.toHaveBeenCalled();
  });

  it('enforces the aggregate expansion budget across attachments', () => {
    const runtime = createIsomerRuntime({
      packs,
      inputBudget: { characters: 1000 },
    });
    expect(() =>
      runtime.surfaces.slack.renderAuthoredMarkdown(
        '<render_attachment id=x /><render_attachment id=y />',
        {
          elements: ['render_attachment'],
          resolveElement: () => attachment('a'.repeat(600)),
        }
      )
    ).toThrow('characters');
  });

  it('enforces the runtime budget on repeated reference expansion', () => {
    const runtime = createIsomerRuntime({
      packs,
      inputBudget: { characters: 1000 },
    });
    expect(() =>
      runtime.surfaces.slack.renderAuthoredMarkdown(
        `${'[d] '.repeat(20)}\n\n[d]: https://elastic.co/${'x'.repeat(100)}`,
        { elements: ['render_attachment'], resolveElement: () => null }
      )
    ).toThrow('characters');
  });

  it('uses the copy validated by the runtime and keeps attachment headings', () => {
    const runtime = createIsomerRuntime({ packs });
    const composition = {
      ...attachment('original'),
      title: '[title](javascript:bad)',
      subtitle: 'subtitle',
    };
    const result = runtime.surfaces.slack.renderAuthoredMarkdown(
      '<render_attachment id=x />',
      { elements: ['render_attachment'], resolveElement: () => composition }
    );
    expect(composition.body[0]?.text).toBe('original');
    expect(result.text).toContain('original');
    expect(result.text).toContain('subtitle');
    expect(JSON.stringify(result.blocks)).not.toContain(
      '"url":"javascript:bad"'
    );
  });
});
