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
import type { IsomerGuideOptions, IsomerToolsRuntime } from './types';

const DEFAULT_GUIDE = `Answer with a single composition built only from the primitives below. Prefer one primitive that says the whole thing over several that each say part of it. When \`${ISOMER_TOOL_NAMES.listViews}\` is offered, prefer a registered view that answers the question over composing one. Call \`${ISOMER_TOOL_NAMES.validate}\` before rendering and repair every error it reports.`;

const LOOKUP = `## Before you write\n\nCall \`${ISOMER_TOOL_NAMES.describePrimitives}\` with every type you plan to use, the containers you nest in included, for each one's full entry and JSON Schema. A validation error names the primitive it lands in, so look that one up when you repair it.`;

const oneLine = (text: string): string =>
  text.replace(/\s+/g, (run) => (/[\r\n\u2028\u2029]/.test(run) ? ' ' : run));

/** The authoring overview for `runtime`: guide, rules, registered views, and a one-line index of the primitives by group. */
export const buildIsomerAuthoringGuide = ({
  runtime,
  guide = DEFAULT_GUIDE,
  rules = [],
  examples = [],
  profile = 'compose-from-primitives',
}: IsomerGuideOptions): string => {
  const { primitives, groups, views } = runtime.getAuthoringContext();
  const prompt = buildAuthoringPrompt(profile, {
    guide,
    primitives,
    catalog: 'index',
    groups,
    examples,
    views,
    rules: rules.map((rule) => `- ${oneLine(rule)}`).join('\n'),
  });
  return `${prompt}\n\n${LOOKUP}`;
};

/** The full catalog entries of `types`, then the JSON Schema `$defs` they reach. */
export const buildPrimitiveDescriptions = ({
  runtime,
  types,
}: {
  runtime: Pick<IsomerToolsRuntime, 'getAuthoringContext'>;
  types: readonly string[];
}): string => {
  const { primitives, schema } = runtime
    .getAuthoringContext()
    .describePrimitives(types);
  return [
    `## Primitives\n\n${primitives.map(formatPrimitiveEntry).join('\n')}`,
    '## JSON Schema\n\nEach primitive is `$defs.<type>`. `bodyNode` stands for any primitive in the index.',
    `\`\`\`json\n${JSON.stringify(schema, null, 2)}\n\`\`\``,
  ].join('\n\n');
};
