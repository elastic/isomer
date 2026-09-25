/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildAuthoringPrompt } from '@elastic/isomer-sdk/author';

import type { IsomerToolsBaseOptions } from './types';

/** The guide {@link buildIsomerAuthoringGuide} opens with when a host supplies none. */
export const DEFAULT_ISOMER_GUIDE =
  'Answer with a single composition built only from the primitives below. Prefer one primitive that says the whole thing over several that each say part of it. Call `isomer_validate` before rendering and repair every error it reports.';

/** The authoring prompt for `runtime`: guide, rules, registered views, the primitive catalog, and the composition JSON Schema. Views are read live. */
export const buildIsomerAuthoringGuide = ({
  runtime,
  guide = DEFAULT_ISOMER_GUIDE,
  rules = [],
  examples = [],
  profile = 'compose-from-primitives',
}: Pick<
  IsomerToolsBaseOptions,
  'runtime' | 'guide' | 'rules' | 'examples' | 'profile'
>): string => {
  const { schema, primitives, views } = runtime.getAuthoringContext();
  return buildAuthoringPrompt(profile, {
    guide,
    schema,
    primitives,
    examples,
    ...(rules.length === 0
      ? {}
      : { rules: rules.map((rule) => `- ${rule}`).join('\n') }),
    ...(views === undefined ? {} : { views }),
  });
};
