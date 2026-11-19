/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { defineView } from '../registry';

import { createIsomerRuntime } from './index';
import { notePrimitive, packOf, view } from './runtime.fixtures';

describe('createIsomerRuntime', () => {
  it('registers, lists, and requests views through the runtime view registry', async () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      views: [
        defineView({
          id: 'test.note-view',
          title: 'Note view',
          description: 'A registered note view.',
          answers: ['Show a note'],
          input: z.object({ text: z.string() }),
          build: ({ input }) => view(input.text),
        }),
      ],
    });

    expect(runtime.viewRegistry.list()).toEqual([
      expect.objectContaining({ id: 'test.note-view', title: 'Note view' }),
    ]);
    expect(runtime.viewRegistry.get('test.note-view')).toMatchObject({
      id: 'test.note-view',
    });

    const response = await runtime.viewRegistry.request(
      'test.note-view',
      undefined,
      { text: 'From registry' }
    );
    expect(response.validation).toMatchObject({ valid: true });
    expect(response.composition.body).toEqual([
      { type: 'note', text: 'From registry' },
    ]);

    await expect(
      runtime.viewRegistry.request('test.note-view', undefined, {
        text: 42,
      })
    ).rejects.toMatchObject({
      name: 'RegisteredViewInputError',
      code: 'VIEW_INPUT_INVALID',
    });

    expect(() =>
      runtime.viewRegistry.register({
        id: 'test.note-view',
        title: 'Duplicate',
        description: 'Duplicate registration.',
        answers: ['x'],
        build: () => view('duplicate'),
      })
    ).toThrow('View "test.note-view" is already registered');

    await expect(
      runtime.viewRegistry.request('test.missing-view', undefined)
    ).rejects.toThrow('Unknown view "test.missing-view"');
  });

  it('passes raw input through for views without a schema', async () => {
    const runtime = createIsomerRuntime({
      packs: [packOf(notePrimitive)],
      views: [
        {
          id: 'test.untyped-view',
          title: 'Untyped view',
          description: 'A view without an input schema.',
          answers: ['Show untyped view'],
          build: ({ input }) => view(JSON.stringify(input)),
        },
      ],
    });

    const response = await runtime.viewRegistry.request(
      'test.untyped-view',
      undefined,
      { anything: true }
    );
    expect(response.composition.body).toEqual([
      { type: 'note', text: JSON.stringify({ anything: true }) },
    ]);
  });
});
