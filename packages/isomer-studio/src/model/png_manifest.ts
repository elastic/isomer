/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StudioTheme } from '../config';

/** One prerendered PNG, with where it came from for debugging. */
export interface PngManifestEntry {
  /** Relative to the manifest. */
  file: string;
  primitive: string;
  example: string;
  theme: StudioTheme;
}

/** `png/manifest.json` in a static build, keyed by `compositionKey`. */
export interface PngManifest {
  version: 1;
  entries: Record<string, PngManifestEntry>;
}

export const PNG_UNAVAILABLE_MESSAGE =
  'PNG previews of edited compositions need `isomer-studio dev`.';

/** A static build has no PNG for this composition. Identify it by `name`. */
export class PngUnavailableError extends Error {
  override readonly name = 'PngUnavailableError';

  constructor() {
    super(PNG_UNAVAILABLE_MESSAGE);
  }
}

export const isPngUnavailableError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  'name' in error &&
  error.name === 'PngUnavailableError';

export const isPngManifest = (value: unknown): value is PngManifest =>
  typeof value === 'object' &&
  value !== null &&
  'version' in value &&
  value.version === 1 &&
  'entries' in value &&
  typeof value.entries === 'object' &&
  value.entries !== null;
