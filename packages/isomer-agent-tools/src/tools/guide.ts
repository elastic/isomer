/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildAuthoringPrompt,
  formatPrimitiveEntry,
} from '@elastic/isomer-sdk/author';

import { ISOMER_TOOL_NAMES } from './names';
import type { IsomerToolsBaseOptions } from './types';

/** The guide {@link buildIsomerAuthoringGuide} opens with when a host supplies none. */
export const DEFAULT_ISOMER_GUIDE =
  'Answer with a single composition built only from the primitives below. Prefer one primitive that says the whole thing over several that each say part of it. Call `isomer_validate` before rendering and repair every error it reports.';

/** Server or system instructions pointing an agent at the tools in order. */
export const DEFAULT_ISOMER_INSTRUCTIONS = `Answers are compositions: typed JSON the host validates and renders. Read \`${ISOMER_TOOL_NAMES.authoringGuide}\`, look up the primitives you pick with \`${ISOMER_TOOL_NAMES.describePrimitives}\`, check the composition with \`${ISOMER_TOOL_NAMES.validate}\`, and render it with \`${ISOMER_TOOL_NAMES.render}\`.`;

const LOOKUP = `## Before you write\n\nCall \`${ISOMER_TOOL_NAMES.describePrimitives}\` with every type you plan to use, the containers you nest in included, for each one's full entry and JSON Schema. A validation error names the primitive it lands in, so look that one up when you repair it.`;

/** The authoring overview for `runtime`: guide, rules, registered views, and an index of the primitives by group. Views are read live. */
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
  const { primitives, groups, views } = runtime.getAuthoringContext();
  const prompt = buildAuthoringPrompt(profile, {
    guide,
    primitives,
    catalog: 'index',
    examples,
    ...(groups === undefined ? {} : { groups }),
    ...(rules.length === 0
      ? {}
      : { rules: rules.map((rule) => `- ${rule}`).join('\n') }),
    ...(views === undefined ? {} : { views }),
  });
  return `${prompt}\n\n${LOOKUP}`;
};

/** The catalog entries of `types`, then the JSON Schema they reach. */
export const buildPrimitiveDescriptions = ({
  runtime,
  types,
}: Pick<IsomerToolsBaseOptions, 'runtime'> & {
  types: readonly string[];
}): string => {
  const { primitives, schema } = runtime
    .getAuthoringContext()
    .describePrimitives(types);
  return [
    `## Primitives\n\n${primitives.map(formatPrimitiveEntry).join('\n')}`,
    '## JSON Schema\n\nEach primitive is `$defs.<type>`, and a shape it reuses is named for the properties that hold it, e.g. `<type>.before+after`. `bodyNode` stands for any primitive in the index, as its own object; a container’s description names any it cannot hold.',
    `\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``,
  ].join('\n\n');
};
