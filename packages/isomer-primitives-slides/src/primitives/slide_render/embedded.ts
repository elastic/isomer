/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderThemeSchema, z } from '@elastic/isomer-sdk';
import type { ZodType } from 'zod';

/** Primitive types that hold an embedded composition. */
export const EMBEDDING_TYPES: ReadonlySet<string> = new Set([
  'slideAnnotatedRender',
  'slideRender',
  'slideRenderGrid',
]);

/** Message for a render found inside an embedded composition. */
export const NESTED_RENDER_ERROR =
  'an embedded composition cannot embed another render';

/** Path to the first node of an {@link EMBEDDING_TYPES} type anywhere inside `value`, or `undefined`. */
export const findNestedRender = (
  value: unknown,
  path: readonly (string | number)[] = []
): (string | number)[] | undefined => {
  if (Array.isArray(value)) {
    for (const [index, item] of value.entries()) {
      const found = findNestedRender(item, [...path, index]);
      if (found) {
        return found;
      }
    }
    return undefined;
  }
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  const { type } = value as { type?: unknown };
  if (typeof type === 'string' && EMBEDDING_TYPES.has(type)) {
    return [...path];
  }
  for (const [key, child] of Object.entries(value)) {
    const found = findNestedRender(child, [...path, key]);
    if (found) {
      return found;
    }
  }
  return undefined;
};

/**
 * The `Composition` envelope around `bodyNodeSchema`.
 *
 * Mirrors the SDK's `buildCompositionSchema`, which the SDK does not export.
 */
export const embeddedCompositionSchema = (bodyNodeSchema: ZodType<unknown>) =>
  z
    .object({
      type: z.literal('view').describe('Always `view`.'),
      version: z
        .literal(1)
        .describe('Wire-format version. Omit it.')
        .optional(),
      title: z
        .string()
        .describe(
          'Names the embedded slide in text, markdown, and Slack output.'
        )
        .optional(),
      subtitle: z
        .string()
        .describe('Not drawn; kept with the composition.')
        .optional(),
      theme: renderThemeSchema
        .describe(
          'Not read: the embedded slide follows the host slide’s theme.'
        )
        .optional(),
      body: z
        .array(bodyNodeSchema)
        .min(1)
        .describe(
          'The nodes to render, usually one `slideFrame` holding a whole slide. It may not contain a `slideRender`, `slideRenderGrid`, or `slideAnnotatedRender`.'
        ),
      meta: z
        .record(z.string(), z.unknown())
        .describe('Provenance and freshness, passed through unread.')
        .optional(),
    })
    .strict();

/** Adds a {@link NESTED_RENDER_ERROR} issue when `composition` embeds a render. */
export const refineNestedRender = (
  composition: { body: readonly unknown[] } | undefined,
  ctx: z.RefinementCtx,
  at: readonly (string | number)[]
): void => {
  const found = composition && findNestedRender(composition.body);
  if (found) {
    ctx.addIssue({
      code: 'custom',
      message: NESTED_RENDER_ERROR,
      path: [...at, 'body', ...found],
    });
  }
};

/** How a render names what it embeds: the host's slide reference, else the composition's title. */
export const embeddedLabel = ({
  slide,
  composition,
}: {
  slide?: string;
  composition?: { title?: string };
}): string =>
  slide ? `slide ${slide}` : (composition?.title ?? 'a composition');
