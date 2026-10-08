/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ICON_VARS } from '@elastic/isomer-sdk';

/** A colour per `--isomer-icon-*` slot, keyed by the slot's suffix. */
export type IconColors = Readonly<Record<IconSlot, string>>;

type IconSlot = (typeof ICON_VARS)[number] extends `--isomer-icon-${infer Slot}`
  ? Slot
  : never;

const ICON_VAR = /var\(\s*--isomer-icon-([a-z]+)\s*(?:,\s*([^)]*?)\s*)?\)/g;

const isSlot = (name: string, colors: IconColors): name is IconSlot =>
  Object.hasOwn(colors, name);

/**
 * A pack icon as an `<img>` source, so its markup never reaches the DOM.
 *
 * An image inherits neither CSS variables nor `currentColor`, so both resolve to `colors`.
 */
export const iconDataUri = (svg: string, colors: IconColors): string => {
  const painted = svg
    .replace(ICON_VAR, (match, name: string, fallback?: string) =>
      isSlot(name, colors) ? colors[name] : (fallback ?? match)
    )
    .replace(/\bcurrentColor\b/g, colors.fg)
    .replace(
      /^(\s*<svg)(?![^>]*\sxmlns=)/,
      '$1 xmlns="http://www.w3.org/2000/svg"'
    );
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(painted)}`;
};
