/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Composition,
  PrimitiveNode,
  ValidationResult,
} from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import {
  createViewRegistry,
  defineView,
  RegisteredViewInputError,
  type ViewInput,
} from './view_registry';

interface TestTextNode extends PrimitiveNode {
  type: 'text';
  body: string;
}

const validateComposition = (
  composition: Composition<TestTextNode>
): ValidationResult =>
  composition.body.length > 0
    ? { valid: true, errors: [], warnings: [] }
    : {
        valid: false,
        errors: [{ path: 'body', message: 'must contain at least one node' }],
        warnings: [],
      };

const textComposition = (body: string): Composition<TestTextNode> => ({
  type: 'view',
  body: [{ type: 'text', body }],
});

describe('view registry', () => {
  const registryView = defineView({
    id: 'test.summary',
    title: 'Summary',
    description: 'A registered summary view.',
    answers: ['Show summary'],
    build: () => textComposition('Summary body.'),
  });

  it('discovers and requests registered views', async () => {
    const registry = createViewRegistry(validateComposition);

    registry.register(registryView);

    expect(registry.list()).toEqual([
      expect.objectContaining({
        id: 'test.summary',
        title: 'Summary',
      }),
    ]);

    const response = await registry.request('test.summary', undefined);

    expect(response.validation).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
    expect(response.composition.body).toEqual([
      { type: 'text', body: 'Summary body.' },
    ]);
  });

  it('rejects duplicate view ids', () => {
    const registry = createViewRegistry(validateComposition);

    registry.register(registryView);

    expect(() => registry.register(registryView)).toThrow(
      'View "test.summary" is already registered'
    );
  });

  it('rejects unknown view ids', async () => {
    const registry = createViewRegistry(validateComposition);

    await expect(registry.request('missing.view', undefined)).rejects.toThrow(
      'Unknown view "missing.view"'
    );
  });
});

describe('typed registered view inputs', () => {
  const inputSchema = z.object({
    service: z.string(),
    range: z.string().optional(),
    limit: z.number().min(1).max(100).optional(),
  });

  const typedView = defineView({
    id: 'test.typed',
    title: 'Typed view',
    description: 'A view with a Zod input schema.',
    answers: ['Show typed view'],
    input: inputSchema,
    build: ({ input }) => {
      const focus: string = input.service;
      const limit: number | undefined = input.limit;
      return textComposition(
        `Typed view for ${focus}${limit ? ` (limit ${limit})` : ''}`
      );
    },
  });

  it('infers the build input type from the Zod schema and validates valid input', async () => {
    const registry = createViewRegistry(validateComposition);
    registry.register(typedView);

    const response = await registry.request('test.typed', undefined, {
      service: 'web',
      limit: 5,
    });

    expect(response.validation).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
    expect(response.composition.body).toEqual([
      { type: 'text', body: 'Typed view for web (limit 5)' },
    ]);
  });

  it('throws RegisteredViewInputError with structured paths for invalid input', async () => {
    const registry = createViewRegistry(validateComposition);
    registry.register(typedView);

    let caught: unknown;
    try {
      await registry.request('test.typed', undefined, {
        limit: 999,
      });
    } catch (error) {
      caught = error;
    }

    expect(caught).toMatchObject({
      name: 'RegisteredViewInputError',
      code: 'VIEW_INPUT_INVALID',
      viewId: 'test.typed',
    });
    const error = caught as RegisteredViewInputError;
    expect(error.errors).toEqual(
      expect.arrayContaining([
        { path: 'service', message: 'is required' },
        expect.objectContaining({ path: 'limit' }),
      ])
    );
  });

  it('reports a wrong input type as a type error, not a missing field', async () => {
    const registry = createViewRegistry(validateComposition);
    registry.register(typedView);

    const caught = await registry
      .request('test.typed', undefined, { service: 'web', range: 42 })
      .catch((error: unknown) => error as RegisteredViewInputError);

    expect(caught).toMatchObject({ code: 'VIEW_INPUT_INVALID' });
    expect((caught as RegisteredViewInputError).errors).toHaveLength(1);
    expect((caught as RegisteredViewInputError).errors[0]?.path).toBe('range');
    expect((caught as RegisteredViewInputError).errors[0]?.message).not.toBe(
      'is required'
    );
  });

  it('derives inputSchema from the Zod input', () => {
    const registry = createViewRegistry(validateComposition);
    registry.register(typedView);

    const summary = registry.get('test.typed');
    const schema = summary?.inputSchema as
      | {
          type?: string;
          properties?: Record<string, unknown>;
          required?: string[];
        }
      | undefined;

    expect(schema?.type).toBe('object');
    expect(schema?.properties?.service).toBeTypeOf('object');
    expect(schema?.properties?.range).toBeTypeOf('object');
    expect(schema?.properties?.limit).toBeTypeOf('object');
    expect(schema?.required).toContain('service');
    expect(schema?.required ?? []).not.toContain('range');
    expect(schema?.required ?? []).not.toContain('limit');
  });

  it('projects a summary once at register and hands out that instance', async () => {
    const registry = createViewRegistry(validateComposition);
    registry.register(typedView);

    const summary = registry.get('test.typed');
    expect(summary?.inputSchema).toBeDefined();
    expect(registry.get('test.typed')).toBe(summary);
    expect(registry.list()).toEqual([summary]);
    expect(registry.list()[0]).toBe(summary);

    const response = await registry.request('test.typed', undefined, {
      service: 'checkout',
    });
    expect(response.view).toBe(summary);
  });

  it('keeps views without an input schema behaving as before', async () => {
    const registry = createViewRegistry(validateComposition);
    registry.register(
      defineView({
        id: 'test.untyped',
        title: 'Untyped',
        description: 'Pre-schema view.',
        answers: ['x'],
        build: ({ input }) => textComposition(JSON.stringify(input)),
      })
    );

    const response = await registry.request('test.untyped', undefined, {
      whatever: ['really', 1, true],
    });
    expect(response.validation).toEqual({
      valid: true,
      errors: [],
      warnings: [],
    });
  });

  it('omits inputSchema for a view that declares no input', () => {
    const registry = createViewRegistry(validateComposition);
    registry.register(
      defineView({
        id: 'test.no-input',
        title: 'No input',
        description: 'Takes whatever it is handed.',
        answers: ['x'],
        build: () => textComposition('none'),
      })
    );

    expect(registry.get('test.no-input')?.inputSchema).toBeUndefined();
  });
});

describe('defineView', () => {
  it('builds a view from build({ context, input })', async () => {
    const registry = createViewRegistry<{ user: string }, TestTextNode>(
      validateComposition
    );
    registry.register(
      defineView<{ user: string }, ViewInput, TestTextNode>({
        id: 'test.define.build',
        title: 'Define with build',
        answers: ['x'],
        build: ({ context, input }) =>
          textComposition(`${context.user}:${JSON.stringify(input)}`),
      })
    );

    const response = await registry.request(
      'test.define.build',
      { user: 'alice' },
      { q: 1 }
    );
    expect(response.composition.body).toEqual([
      { type: 'text', body: 'alice:{"q":1}' },
    ]);
  });

  it('defaults description to title and passes through answers/input schema', () => {
    const inputSchema = z.object({ service: z.string() });
    const view = defineView({
      id: 'test.define.metadata',
      title: 'Define metadata',
      answers: ['Show metadata'],
      input: inputSchema,
      build: ({ input: { service } }) => textComposition(service),
    });

    expect(view.description).toBe('Define metadata');
    expect(view.answers).toEqual(['Show metadata']);
    expect(view.input).toBe(inputSchema);
  });
});
