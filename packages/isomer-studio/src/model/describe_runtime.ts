/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  PropDescriptor,
  RegisteredViewSummary,
  RuntimeSurfaces,
} from '@elastic/isomer-runtime';
import type {
  AnyPrimitiveDefinition,
  PrimitiveCatalogEntry,
  PrimitiveGroup,
} from '@elastic/isomer-sdk';

import type { StudioRuntime } from '../config';

import type { AuthoringTypes } from './authoring_types';
import { authoringDeclarations, bodyJsonSchema } from './authoring_types';
import type { StudioExample } from './read_examples';
import { readExamples } from './read_examples';

/** A surface the runtime can expose. */
export type StudioSurface = keyof RuntimeSurfaces;

/** Display names in display order, exhaustive over the runtime's surfaces so a new one fails the type check here. */
export const SURFACE_LABELS: Readonly<Record<StudioSurface, string>> = {
  react: 'React',
  html: 'HTML',
  slack: 'Slack',
  markdown: 'Markdown',
  text: 'Text',
  snapshot: 'Snapshot',
};

/** The runtime's catalog entry for a primitive, plus what the Studio derives for display. */
export interface PrimitiveDoc extends PrimitiveCatalogEntry {
  label: string;
  group: string;
  examples: StudioExample[];
  props: PropDescriptor[];
  surfaces: StudioSurface[];
  definition: AnyPrimitiveDefinition;
}

export interface RuntimeDocs {
  primitives: PrimitiveDoc[];
  /** The packs' groups in pack order, each sorted by label, then `Other` for ungrouped primitives. */
  groups: PrimitiveGroup[];
  views: RegisteredViewSummary[];
  surfaces: StudioSurface[];
  authoring: AuthoringTypes;
}

const UNGROUPED = 'Other';

/** `statGroup` becomes `Stat group`, for a primitive whose catalog has no `name`. */
export const humanize = (type: string): string => {
  const words = type
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const isStudioSurface = (name: string): name is StudioSurface =>
  name in SURFACE_LABELS;

/** Surfaces present on `runtime.surfaces`, in {@link SURFACE_LABELS} order; `snapshot` is absent without frames. */
export const runtimeSurfaces = (
  runtime: Pick<StudioRuntime, 'surfaces'>
): StudioSurface[] => {
  const { surfaces } = runtime;
  return Object.keys(SURFACE_LABELS).filter(
    (name): name is StudioSurface =>
      isStudioSurface(name) && surfaces[name] !== undefined
  );
};

/** Everything the Studio shows about a runtime, read from its public API. */
export const describeRuntime = (runtime: StudioRuntime): RuntimeDocs => {
  const context = runtime.getAuthoringContext();
  const { primitives: catalog, groups, views } = context;
  const { support } = runtime.getCapabilities();
  const { props } = context.describePrimitives(
    runtime.primitives.map(({ type }) => type)
  );
  const surfaces = runtimeSurfaces(runtime);
  const groupOf = new Map(
    groups.flatMap(({ title, types }) => types.map((type) => [type, title]))
  );

  const primitives = runtime.primitives.map((definition): PrimitiveDoc => {
    const { type } = definition;
    const entry =
      catalog.find((candidate) => candidate.type === type) ??
      definition.catalog;
    return {
      ...entry,
      label: entry.name ?? humanize(type),
      group: groupOf.get(type) ?? UNGROUPED,
      examples: readExamples(definition),
      props: (props[type] ?? []).filter(({ name }) => name !== 'type'),
      surfaces: surfaces.filter(
        (surface) => support[type]?.[surface] === 'native'
      ),
      definition,
    };
  });

  const labelOf = new Map(primitives.map(({ type, label }) => [type, label]));
  const byLabel = (types: readonly string[]): string[] =>
    [...types].sort((a, b) =>
      (labelOf.get(a) ?? a).localeCompare(labelOf.get(b) ?? b)
    );
  const ungrouped = primitives
    .filter(({ type }) => !groupOf.has(type))
    .map(({ type }) => type);

  return {
    primitives,
    groups: [
      ...groups.map(({ title, types }) => ({ title, types: byLabel(types) })),
      ...(ungrouped.length
        ? [{ title: UNGROUPED, types: byLabel(ungrouped) }]
        : []),
    ],
    views,
    surfaces,
    authoring: {
      declarations: authoringDeclarations(context.schema, runtime.primitives),
      bodySchema: bodyJsonSchema(context),
    },
  };
};
