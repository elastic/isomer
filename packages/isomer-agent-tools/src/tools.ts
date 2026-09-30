/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type Composition,
  formatValidationError,
  ISOMER_ERROR_CODES,
  type RenderTheme,
  type ValidationError,
} from '@elastic/isomer-sdk';
import { z, type ZodObject } from 'zod';

import { checkComposition } from './check';
import { buildIsomerAuthoringGuide, buildPrimitiveDescriptions } from './guide';
import { ISOMER_TOOL_NAMES } from './names';
import { errorMessage, imageResult, jsonResult, textResult } from './result';
import type {
  IsomerTool,
  IsomerToolResult,
  IsomerToolsOptions,
  IsomerToolSurface,
} from './types';

const TEXT_SURFACES = ['text', 'markdown', 'html', 'slack'] as const;

const MAX_DESCRIBED_TYPES = 12;

const MAX_INPUT_STRING_LENGTH = 200;

// The recursive node union is too large for a tool schema, so `isomer_validate` enforces shape.
const compositionInput = z
  .looseObject({})
  .describe(
    `A composition: \`{ "type": "view", "body": [...] }\`. Read \`${ISOMER_TOOL_NAMES.authoringGuide}\` for the primitives, and \`${ISOMER_TOOL_NAMES.describePrimitives}\` for the schema of each one you use, before writing one.`
  );

/** `definition` with a handler that resolves to a failed call rather than rejecting. */
const tool = <TInput extends ZodObject>(
  definition: IsomerTool<TInput>
): IsomerTool<TInput> => ({
  ...definition,
  handler: async (input) => {
    try {
      return await definition.handler(input);
    } catch (error) {
      return textResult(errorMessage(error), true);
    }
  },
});

const VALIDATION_ERROR_CODES: Readonly<Record<string, string>> = {
  CompositionValidationError: ISOMER_ERROR_CODES.COMPOSITION_INVALID,
  RegisteredViewInputError: ISOMER_ERROR_CODES.VIEW_INPUT_INVALID,
};

const isValidationError = (entry: unknown): entry is ValidationError => {
  const { path, message } = (entry ?? {}) as Partial<ValidationError>;
  return typeof path === 'string' && typeof message === 'string';
};

const hasValidationErrors = (
  error: unknown
): error is { message: string; errors: ValidationError[] } => {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const { name, code, message, errors } = error as Record<string, unknown>;
  return (
    typeof name === 'string' &&
    Object.hasOwn(VALIDATION_ERROR_CODES, name) &&
    VALIDATION_ERROR_CODES[name] === code &&
    typeof message === 'string' &&
    Array.isArray(errors) &&
    errors.length > 0 &&
    errors.every(isValidationError)
  );
};

const viewErrorResult = (error: unknown): IsomerToolResult =>
  hasValidationErrors(error)
    ? jsonResult(
        {
          error: error.message.split('\n')[0],
          errors: error.errors.map(formatValidationError),
        },
        true
      )
    : textResult(errorMessage(error), true);

/** The agent tools for `runtime`, whose handlers never reject. The view tools are included only when the registry lists a view at creation. */
export const createIsomerTools = <THostContext = unknown>(
  options: IsomerToolsOptions<THostContext>
): IsomerTool[] => {
  const { runtime, frame, image, hostContext, heading = true } = options;
  const surfaces: readonly IsomerToolSurface[] = image
    ? [...TEXT_SURFACES, 'png']
    : TEXT_SURFACES;

  const check = (value: unknown) => checkComposition(runtime, frame, value);

  const render = async (
    composition: Composition,
    surface: IsomerToolSurface,
    theme: RenderTheme | undefined
  ): Promise<IsomerToolResult> => {
    const themed = theme === undefined ? {} : { theme };
    switch (surface) {
      case 'text':
        return textResult(
          runtime.surfaces.text.render(composition, { heading })
        );
      case 'markdown':
        return textResult(
          runtime.surfaces.markdown.render(composition, { heading })
        );
      case 'html':
        return textResult(
          runtime.surfaces.html.render(composition, {
            ...themed,
            css: 'inline',
            heading,
          }).html
        );
      case 'slack':
        return jsonResult(
          runtime.surfaces.slack.render(composition, { heading })
        );
      case 'png':
        if (!image) {
          return textResult('The png surface is not available.', true);
        }
        return imageResult(await image(composition, themed));
    }
  };

  const authoringGuide = tool({
    name: ISOMER_TOOL_NAMES.authoringGuide,
    title: 'Isomer authoring guide',
    description: `Returns how to write a composition for this host: the guide, the rules, any registered views, and an index of the primitives by type and purpose. Read it first, then call \`${ISOMER_TOOL_NAMES.describePrimitives}\` for the primitives you pick.`,
    inputSchema: z.object({}),
    handler: () =>
      Promise.resolve(textResult(buildIsomerAuthoringGuide(options))),
  });

  const describePrimitives = tool({
    name: ISOMER_TOOL_NAMES.describePrimitives,
    title: 'Describe primitives',
    description: `Returns the full catalog entry and JSON Schema of each primitive type given: when to use it, when not to, an example, and every field. Ask for the types you will use, the containers you nest in included. Up to ${MAX_DESCRIBED_TYPES} per call, so call again for more.`,
    inputSchema: z.object({
      types: z
        .array(z.string().min(1).max(MAX_INPUT_STRING_LENGTH))
        .min(1)
        .max(MAX_DESCRIBED_TYPES)
        .describe('Primitive types from the guide’s index.'),
    }),
    handler: ({ types }) => {
      const known = runtime
        .getAuthoringContext()
        .primitives.map(({ type }) => type);
      const unknown = types.filter((type) => !known.includes(type));
      return Promise.resolve(
        unknown.length > 0
          ? jsonResult(
              { error: 'Unknown primitive types.', unknown, known },
              true
            )
          : textResult(buildPrimitiveDescriptions({ runtime, types }))
      );
    },
  });

  const validate = tool({
    name: ISOMER_TOOL_NAMES.validate,
    title: 'Validate a composition',
    description:
      'Checks a composition against the schema and the host’s rules. Returns `{ valid, errors, warnings }`; repair every error and validate again before rendering.',
    inputSchema: z.object({ composition: compositionInput }),
    handler: ({ composition }) => {
      const { valid, errors, warnings } = check(composition);
      return Promise.resolve(jsonResult({ valid, errors, warnings }));
    },
  });

  const renderTool = tool({
    name: ISOMER_TOOL_NAMES.render,
    title: 'Render a composition',
    description: `Validates a composition and renders it to one surface: ${surfaces.map((surface) => `\`${surface}\``).join(', ')}. An invalid composition returns its errors instead.`,
    inputSchema: z.object({
      composition: compositionInput,
      surface: z.enum(surfaces).describe('The output format.'),
      theme: z
        .enum(['auto', 'light', 'dark'])
        .optional()
        .describe('Color scheme; defaults to the composition’s own `theme`.'),
    }),
    handler: ({ composition, surface, theme }) => {
      const checked = check(composition);
      if (!checked.valid || checked.composition === undefined) {
        return Promise.resolve(
          jsonResult({ valid: false, errors: checked.errors }, true)
        );
      }
      return render(checked.composition, surface, theme);
    },
  });

  const listViews = tool({
    name: ISOMER_TOOL_NAMES.listViews,
    title: 'List registered views',
    description:
      'Lists the host’s registered views: prebuilt compositions requested by id, with the questions each answers and its input schema. Prefer one over composing from scratch when it answers the question.',
    inputSchema: z.object({}),
    handler: () => Promise.resolve(jsonResult(runtime.viewRegistry.list())),
  });

  const requestView = tool({
    name: ISOMER_TOOL_NAMES.requestView,
    title: 'Request a registered view',
    description: `Builds a registered view by id with its input, and returns the composition with its validation result. Render it with \`${ISOMER_TOOL_NAMES.render}\`.`,
    inputSchema: z.object({
      id: z
        .string()
        .min(1)
        .max(MAX_INPUT_STRING_LENGTH)
        .describe(`A view id from \`${ISOMER_TOOL_NAMES.listViews}\`.`),
      input: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Matches the view’s input schema.'),
    }),
    handler: async ({ id, input }) => {
      try {
        const { composition } = await runtime.viewRegistry.request(
          id,
          // `IsomerToolsOptions` requires it whenever `THostContext` excludes `undefined`.
          hostContext as THostContext,
          input
        );
        const { valid, errors, warnings } = check(composition);
        return jsonResult({ composition, valid, errors, warnings });
      } catch (error) {
        return viewErrorResult(error);
      }
    },
  });

  const viewTools =
    runtime.viewRegistry.list().length > 0 ? [listViews, requestView] : [];

  return [
    authoringGuide,
    describePrimitives,
    validate,
    renderTool,
    ...viewTools,
  ];
};
