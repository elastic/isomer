/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type {
  AnyPrimitiveDefinition,
  Composition,
  PrimitivePack,
} from '@elastic/isomer-sdk';
import { formatValidationError } from '@elastic/isomer-sdk';
import { assertPackIconsValid } from '@elastic/isomer-sdk/testing';

import type { StudioConfig, StudioRuntime, StudioTheme } from '../config';
import { composeExample } from '../model/compose_example';
import type { StudioSurface } from '../model/describe_runtime';
import { runtimeSurfaces } from '../model/describe_runtime';
import { readExamples } from '../model/read_examples';
import { slackLimitProblems } from '../model/slack_limits';

export type CheckStatus = 'passed' | 'failed' | 'skipped';

/** What one result checked: a primitive's icon, an example's props, or one surface. */
export type CheckName = StudioSurface | 'icon' | 'png' | 'props';

export interface CheckResult {
  primitive: string;
  /** Absent for checks on the primitive itself, such as `icon`. */
  example?: string | undefined;
  check: CheckName;
  status: CheckStatus;
  message?: string | undefined;
}

export interface CheckReport {
  title: string;
  results: CheckResult[];
  passed: number;
  failed: number;
  skipped: number;
}

export interface CheckOptions {
  /** `react-dom/server`'s `renderToString`, from the config's React. */
  renderToString: (node: ReactNode) => string;
  /** Limits the surfaces rendered; defaults to every surface the runtime has. */
  surfaces?: readonly StudioSurface[] | undefined;
  /** Rasterizes each composition as the `png` check; absent skips it. */
  rasterizePng?: ((composition: Composition) => Promise<unknown>) | undefined;
  theme?: StudioTheme | undefined;
}

type Outcome = Pick<CheckResult, 'message' | 'status'>;

const PASSED: Outcome = { status: 'passed' };

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const fromProblems = (problems: readonly string[]): Outcome =>
  problems.length ? { status: 'failed', message: problems.join('\n') } : PASSED;

const attempt = (check: () => readonly string[]): Outcome => {
  try {
    return fromProblems(check());
  } catch (error) {
    return { status: 'failed', message: describeError(error) };
  }
};

const attemptAsync = async (
  check: () => Promise<unknown>
): Promise<Outcome> => {
  try {
    await check();
    return PASSED;
  } catch (error) {
    return { status: 'failed', message: describeError(error) };
  }
};

/** Renders `composition` on `surface`, returning what Slack would refuse; a render that throws fails. */
const renderSurface = (
  runtime: StudioRuntime,
  surface: StudioSurface,
  composition: Composition,
  renderToString: CheckOptions['renderToString']
): readonly string[] => {
  const { surfaces } = runtime;
  switch (surface) {
    case 'react':
      renderToString(surfaces.react.render(composition, { wrapper: true }));
      return [];
    case 'html':
      surfaces.html.render(composition);
      return [];
    case 'markdown':
      surfaces.markdown.render(composition);
      return [];
    case 'text':
      surfaces.text.render(composition);
      return [];
    case 'slack':
      return slackLimitProblems(surfaces.slack.render(composition));
    case 'snapshot':
      surfaces.snapshot?.render(composition);
      return [];
  }
};

const iconOutcome = (
  pack: PrimitivePack<never>,
  { type, icon }: AnyPrimitiveDefinition
): Outcome => {
  const found = pack.icons?.[type] ?? icon;
  if (!found) {
    return { status: 'failed', message: `\`${type}\` has no icon.` };
  }
  return attempt(() => {
    assertPackIconsValid({ icons: { [type]: found }, primitives: [] });
    return [];
  });
};

const summarize = (title: string, results: CheckResult[]): CheckReport => {
  const count = (status: CheckStatus) =>
    results.filter((result) => result.status === status).length;
  return {
    title,
    results,
    passed: count('passed'),
    failed: count('failed'),
    skipped: count('skipped'),
  };
};

/**
 * Validates and renders every example of every primitive, composed as the Studio composes it, on every surface
 * the runtime has. Surfaces the runtime or a primitive lacks are skipped, not failed.
 */
export const checkStudio = async (
  config: StudioConfig,
  {
    renderToString,
    surfaces: only,
    rasterizePng,
    theme = 'light',
  }: CheckOptions
): Promise<CheckReport> => {
  const { runtime, compose, title = 'Isomer Studio' } = config;
  const { support } = runtime.getCapabilities();
  const available = runtimeSurfaces(runtime);
  const surfaces = only
    ? only.filter((surface) => available.includes(surface))
    : available;
  const results: CheckResult[] = [];

  for (const pack of runtime.packs) {
    for (const definition of pack.primitives) {
      const { type: primitive } = definition;
      results.push({
        primitive,
        check: 'icon',
        ...iconOutcome(pack, definition),
      });

      for (const { name: example, node } of readExamples(definition)) {
        const composition = composeExample(compose, [node], theme);
        const validation = runtime.validate(composition);
        const props = fromProblems(
          validation.errors.map(formatValidationError)
        );
        results.push({ primitive, example, check: 'props', ...props });

        const skipAll = (message: string) =>
          [...surfaces, ...(rasterizePng ? (['png'] as const) : [])].forEach(
            (check) =>
              results.push({
                primitive,
                example,
                check,
                status: 'skipped',
                message,
              })
          );
        if (props.status === 'failed') {
          skipAll('The composition is invalid.');
          continue;
        }

        for (const surface of surfaces) {
          const outcome: Outcome =
            support[primitive]?.[surface] === 'native'
              ? attempt(() =>
                  renderSurface(runtime, surface, composition, renderToString)
                )
              : {
                  status: 'skipped',
                  message: `\`${primitive}\` has no ${surface} renderer.`,
                };
          results.push({ primitive, example, check: surface, ...outcome });
        }

        if (rasterizePng) {
          const outcome: Outcome = available.includes('snapshot')
            ? await attemptAsync(() => rasterizePng(composition))
            : {
                status: 'skipped',
                message: 'The runtime has no snapshot surface.',
              };
          results.push({ primitive, example, check: 'png', ...outcome });
        }
      }
    }
  }

  return summarize(title, results);
};
