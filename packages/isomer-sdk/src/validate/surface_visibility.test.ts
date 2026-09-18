/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { BodyNodeSurface } from '../composition/body_node_base';
import { definePrimitive } from '../define/primitive_module';
import { createPrimitiveDispatcher } from '../render/primitive_dispatch';
import type { CaptionNode, NoteNode, StackNode } from '../testing/sdk.fixtures';
import { fixtureDefinitions } from '../testing/sdk.fixtures';

import {
  createCompositionParser,
  createCompositionValidator,
  warningsForSurface,
} from './validation';

const validate = createCompositionValidator(fixtureDefinitions);
const parse = createCompositionParser(fixtureDefinitions);
const dispatcher = createPrimitiveDispatcher(fixtureDefinitions);

const view = (body: Array<NoteNode | CaptionNode | StackNode>) => ({
  type: 'view' as const,
  body,
});

describe('validate vs parse on duplicate ids', () => {
  const spec = view([
    { type: 'note', body: 'A', id: 'dup' },
    { type: 'note', body: 'B', id: 'dup' },
  ]);

  it('parses a duplicate-id spec as valid', () => {
    const result = parse(spec);
    expect(result.valid).toBe(true);
    expect(result.composition).toEqual(spec);
  });

  it('rejects the same spec at validate', () => {
    const result = validate(spec);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual([
      {
        path: 'body[1].id',
        message: 'duplicates id "dup" first used at body[0]',
      },
    ]);
  });
});

describe('per-surface visibility hints', () => {
  it('skips a node on surfaces it opts out of and keeps it elsewhere', () => {
    const node: NoteNode = {
      type: 'note',
      body: 'Dense table context',
      surfaces: ['react', 'markdown'],
    };

    expect(dispatcher.renderMarkdown(node)).toContain('Dense table context');
    expect(dispatcher.renderText(node)).toBe('');
    expect(dispatcher.renderSlack(node)).toEqual([]);
    expect(dispatcher.renderReact(node)).toBe('Dense table context');
  });

  it('filters container children through the shared dispatch', () => {
    const node: StackNode = {
      type: 'stack',
      items: [
        { type: 'note', body: 'Everywhere' },
        { type: 'note', body: 'HTML only', surfaces: ['react'] },
      ],
    };

    expect(dispatcher.renderText(node)).toContain('Everywhere');
    expect(dispatcher.renderText(node)).not.toContain('HTML only');
    expect(dispatcher.renderReact(node)).toEqual(['Everywhere', 'HTML only']);
  });

  it('warns when every node opts out of a surface', () => {
    const result = validate(
      view([
        { type: 'note', body: 'A', surfaces: ['react', 'svg'] },
        { type: 'note', body: 'B', surfaces: ['react'] },
      ])
    );
    expect(result.valid).toBe(true);
    expect(result.warnings).toEqual([
      {
        surface: 'text',
        message: 'composition renders no nodes on surface "text"',
      },
      {
        surface: 'markdown',
        message: 'composition renders no nodes on surface "markdown"',
      },
      {
        surface: 'slack',
        message: 'composition renders no nodes on surface "slack"',
      },
    ]);
  });

  it('narrows warnings to the surface a caller is about to render', () => {
    const result = validate(
      view([
        { type: 'note', body: 'A', surfaces: ['react', 'svg'] },
        { type: 'note', body: 'B', surfaces: ['react'] },
      ])
    );

    expect(warningsForSurface(result, 'text')).toEqual([
      {
        surface: 'text',
        message: 'composition renders no nodes on surface "text"',
      },
    ]);
    expect(warningsForSurface(result, 'react')).toEqual([]);
  });

  it('emits no empty-surface warnings when at least one node covers each surface', () => {
    const result = validate(
      view([
        { type: 'note', body: 'A', surfaces: ['react'] },
        { type: 'note', body: 'B' },
      ])
    );
    expect(
      (result.warnings ?? []).filter((warning) =>
        warning.message.startsWith('composition renders no nodes')
      )
    ).toEqual([]);
  });

  it('rejects unknown surfaces and empty arrays', () => {
    expect(
      validate(view([{ type: 'note', body: 'A', surfaces: [] }])).valid
    ).toBe(false);
    expect(
      validate(
        view([
          {
            type: 'note',
            body: 'A',
            surfaces: ['html'] as unknown as BodyNodeSurface[],
          },
        ])
      ).valid
    ).toBe(false);
  });
});

describe('missing svgHeight warnings', () => {
  // Gated on `sizesFromNodeHeights`, and needs a primitive with an `svg`
  // renderer but no `metrics.svgHeight` — a shape the conformance fixture pack
  // deliberately cannot have, since every example there must report a height.
  const unmeasured = definePrimitive<{ type: 'unmeasured' }>({
    type: 'unmeasured',
    catalog: {
      type: 'unmeasured',
      purpose: 'unmeasured',
      useWhen: [],
      avoidWhen: [],
      example: { type: 'unmeasured' },
    },
    examples: [{ type: 'unmeasured' }],
    schema: z.object({ type: z.literal('unmeasured') }),
    renderers: {
      react: () => null,
      text: () => 'u',
      markdown: () => 'u',
    },
  });

  const definitions = [unmeasured];

  it('warns when a sizing frame meets a node with no svgHeight', () => {
    const validate = createCompositionValidator(definitions, {
      sizesFromNodeHeights: true,
    });
    const result = validate({ type: 'view', body: [{ type: 'unmeasured' }] });
    expect(result.valid).toBe(true);
    expect(
      result.warnings?.filter((warning) => warning.surface === 'svg')
    ).not.toEqual([]);
  });

  it('stays silent when no frame sizes itself from node heights', () => {
    const validate = createCompositionValidator(definitions, {
      sizesFromNodeHeights: false,
    });
    const result = validate({ type: 'view', body: [{ type: 'unmeasured' }] });
    expect(
      (result.warnings ?? []).filter((warning) => warning.surface === 'svg')
    ).toEqual([]);
  });
});
