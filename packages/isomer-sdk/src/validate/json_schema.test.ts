/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { describe, expect, it } from 'vitest';
import { z, type ZodType } from 'zod';

import type {
  AnyPrimitiveDefinition,
  PrimitiveNode,
} from '../define/primitive_module';
import {
  definePrimitive,
  unresolvedBodyNodeSchema,
} from '../define/primitive_module';

import { buildAuthoringJsonSchema } from './authoring_schema';
import { resolveVocabulary } from './composition_schema';
import { buildCompositionJsonSchema } from './json_schema';
import { namedColorSchema } from './value_schemas';

const renderers = {
  react: () => null,
  text: () => '',
  markdown: () => '',
};

const define = definePrimitive<PrimitiveNode>;

const leaf = (type: string): AnyPrimitiveDefinition =>
  define({
    type,
    catalog: { type, purpose: '', useWhen: [], avoidWhen: [], example: {} },
    examples: [],
    schema: z.object({ type: z.literal(type) }),
    renderers,
  });

const container: AnyPrimitiveDefinition = define({
  type: 'holder',
  catalog: {
    type: 'holder',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: {},
  },
  examples: [],
  schema: z.object({
    type: z.literal('holder'),
    child: unresolvedBodyNodeSchema,
  }),
  schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
    z.object({ type: z.literal('holder'), child: bodyNodeSchema }),
  renderers,
});

const defsOf = (
  schema: Record<string, unknown>
): Record<string, { properties?: { child?: { $ref?: string } } }> =>
  (schema.$defs ?? {}) as Record<
    string,
    { properties?: { child?: { $ref?: string } } }
  >;

describe('buildCompositionJsonSchema', () => {
  it('names a schemaFor container and its recursive body-node reference', () => {
    const projected = buildCompositionJsonSchema([container, leaf('alpha')]);
    const defs = defsOf(projected);

    expect(defs.holder).toBeTypeOf('object');
    expect(defs.alpha).toBeTypeOf('object');
    expect(defs.bodyNode).toBeTypeOf('object');
    expect(defs.holder?.properties?.child).toEqual({
      $ref: '#/$defs/bodyNode',
    });
  });

  it('keeps a property description on a schema also registered for its id', () => {
    const describedContainer: AnyPrimitiveDefinition = define({
      type: 'labeledHolder',
      catalog: {
        type: 'labeledHolder',
        purpose: '',
        useWhen: [],
        avoidWhen: [],
        example: {},
      },
      examples: [],
      schema: z.object({
        type: z.literal('labeledHolder'),
        children: z.array(unresolvedBodyNodeSchema).min(1),
      }),
      schemaFor: (bodyNodeSchema: ZodType<unknown>) =>
        z.object({
          type: z.literal('labeledHolder'),
          children: z.array(bodyNodeSchema).min(1).describe('The held nodes.'),
        }),
      renderers,
    });
    const projected = buildCompositionJsonSchema([
      describedContainer,
      leaf('alpha'),
    ]) as {
      $defs: Record<
        string,
        { properties: Record<string, unknown> } | undefined
      >;
    };
    const children = projected.$defs.labeledHolder?.properties.children as {
      description?: string;
    };

    expect(children.description).toBe('The held nodes.');
  });

  it('restores the global registry after naming a schema twice', () => {
    const alpha = leaf('alpha');
    const { members } = resolveVocabulary([alpha]);
    const member = members.get('alpha') as ZodType;

    buildCompositionJsonSchema([alpha], {
      extraDefs: [{ schema: member, id: 'alphaAlias' }],
    });

    expect(z.globalRegistry.get(member)).toBeUndefined();
  });

  it('names the composition even when definitions come from another inventory', () => {
    const alpha = resolveVocabulary([container, leaf('alpha')]);
    const projected = buildCompositionJsonSchema([container, leaf('beta')], {
      composition: alpha,
    });
    const defs = defsOf(projected);

    expect(defs.holder).toBeTypeOf('object');
    expect(defs.alpha).toBeTypeOf('object');
    expect(defs.beta).toBeUndefined();
    expect(defs.holder?.properties?.child).toEqual({
      $ref: '#/$defs/bodyNode',
    });
  });

  it('emits an optional version const and a view title by default', () => {
    const projected = buildCompositionJsonSchema([leaf('note')]);
    const properties = projected.properties as
      Record<string, { const?: unknown }> | undefined;
    const required = projected.required as string[] | undefined;

    expect(projected.title).toBe('View');
    expect(properties?.version?.const).toBe(1);
    expect(required ?? []).not.toContain('version');
  });
});

const isJsonObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const collectDefs = (
  schema: Record<string, unknown>
): Record<string, unknown> => (schema.$defs ?? {}) as Record<string, unknown>;

const metricPrimitive = define({
  type: 'metric',
  catalog: {
    type: 'metric',
    purpose: '',
    useWhen: [],
    avoidWhen: [],
    example: { type: 'metric', value: 1 },
  },
  examples: [],
  schema: z.object({
    type: z.literal('metric'),
    value: z.number().int(),
    count: z.number().int(),
    tone: namedColorSchema,
    accent: namedColorSchema,
    stacked: z.boolean().optional(),
  }),
  renderers,
});

describe('buildAuthoringJsonSchema', () => {
  it('names shared SDK value schemas and keeps bodyNode', () => {
    const projected = buildAuthoringJsonSchema([metricPrimitive]);
    const defs = collectDefs(projected);

    expect(defs.tone).toMatchObject({ type: 'string' });
    expect(Array.isArray((defs.tone as { enum?: unknown }).enum)).toBe(true);
    expect(defs.bodyNode).toBeTypeOf('object');
    expect(defs.metric).toBeTypeOf('object');
  });

  it('inlines bare scalar defs and flattens ref-only hops', () => {
    const projected = buildAuthoringJsonSchema([metricPrimitive]);
    const defs = collectDefs(projected);

    for (const [id, def] of Object.entries(defs)) {
      if (id === 'bodyNode') {
        continue;
      }
      expect(
        isJsonObject(def) && Object.keys(def).length === 1 && '$ref' in def
      ).toBe(false);
      if (!isJsonObject(def)) {
        continue;
      }
      const hasStructure =
        'properties' in def ||
        'enum' in def ||
        'const' in def ||
        'oneOf' in def ||
        'anyOf' in def;
      if (typeof def.type === 'string' && !hasStructure) {
        expect(['string', 'number', 'integer', 'boolean']).not.toContain(
          def.type
        );
      }
    }
  });

  it('drops MAX_SAFE_INTEGER maxima and node id/surfaces', () => {
    const projected = buildAuthoringJsonSchema([metricPrimitive]);
    const serialized = JSON.stringify(projected);
    expect(serialized).not.toContain(String(Number.MAX_SAFE_INTEGER));

    const metric = collectDefs(projected).metric as {
      properties?: Record<string, unknown>;
    };
    expect(metric.properties?.id).toBeUndefined();
    expect(metric.properties?.surfaces).toBeUndefined();
    expect(metric.properties?.value).toBeDefined();
  });

  it('describes named defs and omits listed properties', () => {
    const projected = buildAuthoringJsonSchema([metricPrimitive], {
      describe: { tone: 'must be one of the named tones' },
      omitProperties: ['metric.stacked'],
    });
    const defs = collectDefs(projected);
    const tone = defs.tone as { description?: string };
    const metric = defs.metric as { properties?: Record<string, unknown> };

    expect(tone.description).toBe('must be one of the named tones');
    expect(metric.properties?.stacked).toBeUndefined();
    expect(metric.properties?.tone).toBeDefined();
  });

  it('serializes smaller than the validator projection', () => {
    const authoring = buildAuthoringJsonSchema([metricPrimitive, leaf('note')]);
    const validator = buildCompositionJsonSchema([
      metricPrimitive,
      leaf('note'),
    ]);

    expect(JSON.stringify(authoring).length).toBeLessThan(
      JSON.stringify(validator).length
    );
  });

  it('leaves id and surfaces on the validator projection', () => {
    const validator = buildCompositionJsonSchema([metricPrimitive]);
    const metric = collectDefs(validator).metric as {
      properties?: Record<string, unknown>;
    };
    expect(metric.properties?.id).toBeDefined();
    expect(metric.properties?.surfaces).toBeDefined();
  });
});
