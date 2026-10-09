/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useState } from 'react';

import type { StudioTheme } from '../config';

export type ColorModePreference = StudioTheme | 'system';

const STORAGE_KEY = 'isomer-studio:color-mode';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export const isColorModePreference = (
  value: unknown
): value is ColorModePreference =>
  value === 'light' || value === 'dark' || value === 'system';

const darkQuery = (): MediaQueryList | undefined =>
  typeof window === 'undefined' ? undefined : window.matchMedia?.(DARK_QUERY);

const storedPreference = (): ColorModePreference => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return isColorModePreference(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
};

/** The chosen color mode, persisted per browser, and the theme it resolves to; `system` follows the OS as it changes. */
export const useColorMode = (): {
  preference: ColorModePreference;
  theme: StudioTheme;
  setPreference: (preference: ColorModePreference) => void;
} => {
  const [preference, setPreference] = useState(storedPreference);
  const [systemIsDark, setSystemIsDark] = useState(
    () => darkQuery()?.matches ?? false
  );

  useEffect(() => {
    const query = darkQuery();
    if (!query) {
      return;
    }
    const onChange = ({ matches }: MediaQueryListEvent) =>
      setSystemIsDark(matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, preference);
    } catch {
      // Storage is optional: a blocked or full store keeps the choice for this page only.
    }
  }, [preference]);

  const theme =
    preference === 'system' ? (systemIsDark ? 'dark' : 'light') : preference;
  return { preference, theme, setPreference };
};
