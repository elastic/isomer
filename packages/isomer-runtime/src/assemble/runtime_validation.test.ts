/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type Composition } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { createIsomerRuntime } from './index';
import {
  boldPrimitive,
  drawingRuntime,
  type NoteNode,
  notePrimitive,
  packOf,
  view,
  type WrapNode,
  wrapPrimitive,
} from './runtime.fixtures';

describe('createIsomerRuntime', () => {
  it('validates and renders custom-only primitive definitions', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const spec = view('Runtime owned');

    expect(runtime.validate(spec)).toMatchObject({ valid: true, errors: [] });
    expect(runtime.surfaces.text.render(spec)).toBe('Runtime owned');
    expect(runtime.surfaces.markdown.render(spec)).toContain('Runtime owned');
    expect(runtime.surfaces.slack.render(spec).blocks).toEqual([
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Runtime owned',
        },
      },
    ]);
  });

  it('exposes the same schema validate/parse use internally, memoized', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });
    const spec = view('Runtime owned');

    const schema = runtime.getCompositionSchema();
    expect(schema.safeParse(spec).success).toBe(true);
    expect(
      schema.safeParse({ type: 'view', body: [{ type: 'nope' }] }).success
    ).toBe(false);
    // Same instance every call: proves `getCompositionSchemaForDefinitions`'s
    // per-definitions-array memoization is actually being hit here, not just
    // present in the SDK.
    expect(runtime.getCompositionSchema()).toBe(schema);
  });

  it('parses an unknown value into a composition, reporting schema failures', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });

    const parsed = runtime.parse(
      JSON.parse('{"type":"view","body":[{"type":"note","text":"Wire"}]}')
    );
    expect(parsed).toMatchObject({ valid: true, errors: [] });
    expect(parsed.composition?.body).toEqual([{ type: 'note', text: 'Wire' }]);

    const rejected = runtime.parse({ type: 'view', body: [{ type: 'nope' }] });
    expect(rejected.valid).toBe(false);
    expect(rejected.composition).toBeUndefined();
    expect(rejected.errors.length).toBeGreaterThan(0);
  });

  it('derives validation from registered primitive schemas', () => {
    const runtime = createIsomerRuntime({ packs: [packOf(notePrimitive)] });

    expect(
      runtime.validate({
        type: 'view',
        body: [{ type: 'note' }],
      } as never)
    ).toMatchObject({ valid: false });
    expect(
      runtime.validate({
        type: 'view',
        body: [{ type: 'table', rows: [] }],
      } as never)
    ).toMatchObject({ valid: false });
  });

  it('reports a duplicate id nested under a container whose child path has no .node suffix', () => {
    // `wrap`'s own path fragment is `items[0]`, not the `.node`-suffixed shape
    // `row` and `dashboardGrid` happen to share — this is what would keep
    // passing if a collector went back to assuming that suffix rather than
    // joining whatever path the container actually reports.
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive, wrapPrimitive)],
    });

    const errors = runtime.validate({
      type: 'view',
      body: [
        { type: 'note', id: 'dup', text: 'first' } as NoteNode,
        {
          type: 'wrap',
          items: [{ type: 'note', id: 'dup', text: 'second' }],
        } as WrapNode,
      ],
    }).errors;

    expect(errors).toContainEqual({
      path: 'body[1].items[0].id',
      message: 'duplicates id "dup" first used at body[0]',
      nodeType: 'note',
    });
  });

  it('reports an ordinary bad node against its own type', () => {
    // The body keeps its discriminated union, so a malformed node is reported
    // against its own `type` rather than against every branch.
    const runtime = drawingRuntime(notePrimitive, boldPrimitive);

    const errors = runtime.validate({
      type: 'view',
      body: [{ type: 'note' }],
    }).errors;

    expect(errors).toEqual([
      { path: 'body[0].text', message: 'is required', nodeType: 'note' },
    ]);
  });

  it('throws on an invalid composition by default everywhere but html and react', () => {
    const runtime = drawingRuntime(notePrimitive);
    const invalid: Composition = {
      type: 'view',
      body: [{ type: 'note', text: '' } as NoteNode],
    };
    const thrown = (render: () => unknown): unknown => {
      try {
        render();
      } catch (error) {
        return error;
      }
      return undefined;
    };
    const invalidComposition = {
      name: 'CompositionValidationError',
      code: 'COMPOSITION_INVALID',
    };

    expect(thrown(() => runtime.surfaces.text.render(invalid))).toMatchObject(
      invalidComposition
    );
    expect(
      thrown(() => runtime.surfaces.markdown.render(invalid))
    ).toMatchObject(invalidComposition);
    expect(thrown(() => runtime.surfaces.slack.render(invalid))).toMatchObject(
      invalidComposition
    );
    expect(
      thrown(() => runtime.surfaces.snapshot?.render(invalid))
    ).toMatchObject(invalidComposition);
    expect(runtime.surfaces.html.render(invalid).validationErrors).not.toEqual(
      []
    );
    expect(
      runtime.surfaces.text.render(invalid, { onValidationError: 'collect' })
    ).toBeTypeOf('string');
  });
});
