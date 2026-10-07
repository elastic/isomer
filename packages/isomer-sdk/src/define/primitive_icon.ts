/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * A 16×16 glyph a host shows beside the primitive: static SVG, inlinable without a renderer.
 *
 * Colours go through {@link ICON_VARS}, optionally with a `currentColor` or hex fallback; `assertPackIconsValid` from `./testing` enforces the rules.
 */
export interface PrimitiveIcon {
  svg: string;
}

/** The colour slots an icon may paint with, which a host sets per theme and mode. */
export const ICON_VARS = [
  '--isomer-icon-accent',
  '--isomer-icon-bg',
  '--isomer-icon-fg',
  '--isomer-icon-muted',
] as const;
