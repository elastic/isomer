/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Composition,
  SurfaceName,
  ValidationResult,
  ValidationWarning,
} from '@elastic/isomer-sdk';
import { warningsForSurface } from '@elastic/isomer-sdk';
import type { SlackBlock } from '@elastic/isomer-sdk/slack';
import { unmodeledSlackBlockTypes } from '@elastic/isomer-sdk/slack';

import type { StudioRuntime } from '../config';
import type { StudioSurface } from '../model/describe_runtime';

export interface SurfaceOutput {
  /** What the surface produced, as text. */
  source: string;
  language: 'html' | 'markdown' | 'text' | 'json';
  warnings: ValidationWarning[];
  error?: string;
  enhancementScript?: string;
  slack?: { text: string; blocks: SlackBlock[] };
  snapshot?: { css: string; html: string; width: number; height: number };
}

type RenderWarning = Omit<ValidationWarning, 'surface'>;

type RenderedOutput = Omit<SurfaceOutput, 'warnings'> & {
  renderWarnings?: readonly RenderWarning[];
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
  enhancements?: readonly string[] | undefined;
}

const render = (
  runtime: StudioRuntime,
  surface: StudioSurface,
  composition: Composition,
  { heading, enhancements }: SurfaceOutputOptions
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
          ...(enhancements ? { enhancements } : {}),
          ...lead,
        }).html,
        language: 'html',
      };
    case 'html': {
      const result = surfaces.html.render(composition, {
        minify: false,
        ...lead,
        ...(enhancements ? { enhancements, scripts: 'host' as const } : {}),
      });
      return {
        source: result.html,
        ...(enhancements ? { enhancementScript: result.js } : {}),
        language: 'html',
      };
    }
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
        renderWarnings: unmodeledSlackBlockTypes(blocks).map((type) => ({
          message: `Isomer doesn't model \`${type}\` blocks, so their Slack limits aren't checked and this preview may not draw them. Check the message in Block Kit Builder.`,
        })),
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
  renderWarnings: readonly RenderWarning[] = []
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
