/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnapshotHeightWarning } from '@elastic/isomer-runtime';
import type {
  Composition,
  SurfaceName,
  ValidationResult,
  ValidationWarning,
} from '@elastic/isomer-sdk';
import { warningsForSurface } from '@elastic/isomer-sdk';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';

import type { StudioRuntime } from '../config';
import type { StudioSurface } from '../model/describe_runtime';

export interface SurfaceOutput {
  /** What the surface produced, as text. */
  source: string;
  language: 'html' | 'markdown' | 'text' | 'json';
  warnings: ValidationWarning[];
  error?: string;
  slack?: { text: string; blocks: SlackBlock[] };
  snapshot?: { css: string; html: string; width: number; height: number };
}

type RenderedOutput = Omit<SurfaceOutput, 'warnings'> & {
  renderWarnings?: readonly SnapshotHeightWarning[];
};

const VALIDATION_SURFACE: Readonly<Record<StudioSurface, SurfaceName>> = {
  react: 'react',
  html: 'react',
  snapshot: 'snapshot',
  markdown: 'markdown',
  text: 'text',
  slack: 'slack',
};

const COLLECT = { onValidationError: 'collect' } as const;

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** Options for {@link renderSurfaceOutput}. */
export interface SurfaceOutputOptions {
  /** `false` leaves out the composition's leading title. Defaults to `true`. */
  heading?: boolean | undefined;
}

const render = (
  runtime: StudioRuntime,
  surface: StudioSurface,
  composition: Composition,
  { heading }: SurfaceOutputOptions
): RenderedOutput => {
  const { surfaces } = runtime;
  const lead = heading === false ? { heading } : {};
  const collect = { ...COLLECT, ...lead };
  switch (surface) {
    case 'react':
      return {
        source: surfaces.html.render(composition, {
          css: 'separate',
          minify: false,
          scripts: 'host',
          ...lead,
        }).html,
        language: 'html',
      };
    case 'html':
      return {
        source: surfaces.html.render(composition, { minify: false, ...lead })
          .html,
        language: 'html',
      };
    case 'markdown':
      return {
        source: surfaces.markdown.render(composition, collect),
        language: 'markdown',
      };
    case 'text':
      return {
        source: surfaces.text.render(composition, collect),
        language: 'text',
      };
    case 'slack': {
      const { text, blocks } = surfaces.slack.render(composition, collect);
      return {
        source: JSON.stringify({ text, blocks }, null, 2),
        language: 'json',
        slack: { text, blocks },
      };
    }
    case 'snapshot': {
      if (!surfaces.snapshot) {
        return {
          source: '',
          language: 'html',
          error: 'This runtime has no frames.',
        };
      }
      const { html, css, width, height, warnings } = surfaces.snapshot.render(
        composition,
        COLLECT
      );
      return {
        source: html,
        language: 'html',
        snapshot: { css, html, width, height },
        renderWarnings: warnings,
      };
    }
  }
};

/** Advisory findings for one surface, from validation and from the render itself, without duplicates. */
const surfaceWarnings = (
  validation: ValidationResult,
  surface: SurfaceName,
  renderWarnings: readonly SnapshotHeightWarning[] = []
): ValidationWarning[] => {
  const seen = new Set<string>();

  return [
    ...warningsForSurface(validation, surface),
    ...renderWarnings.map((warning) => ({ ...warning, surface })),
  ].filter(({ path = '', message }) => {
    const key = `${path}\u0000${message}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
};

/** Renders `composition` on `surface`, collecting findings rather than throwing. */
export const renderSurfaceOutput = (
  runtime: StudioRuntime,
  surface: StudioSurface,
  composition: Composition,
  validation: ValidationResult,
  options: SurfaceOutputOptions = {}
): SurfaceOutput => {
  try {
    const { renderWarnings, ...output } = render(
      runtime,
      surface,
      composition,
      options
    );
    return {
      ...output,
      warnings: surfaceWarnings(
        validation,
        VALIDATION_SURFACE[surface],
        renderWarnings
      ),
    };
  } catch (error) {
    return {
      source: '',
      language: 'text',
      warnings: surfaceWarnings(validation, VALIDATION_SURFACE[surface]),
      error: describeError(error),
    };
  }
};
