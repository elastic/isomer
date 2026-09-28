/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Theme } from '@elastic/isomer-deck/viewer';

const key = 'isomer-studio-theme';

const initialTheme = (): Theme => {
  try {
    const stored = window.localStorage.getItem(key);
    if (stored === 'light' || stored === 'dark') {
      return stored;
    }
  } catch {
    // Storage can be unavailable; the system preference still applies.
  }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

/** The page's color scheme, remembered per browser and applied to the document. */
export const usePageTheme = (): [Theme, () => void] => {
  const [theme, setTheme] = useState(initialTheme);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);
  const toggle = useCallback(
    () =>
      setTheme((prev) => {
        const next = prev === 'dark' ? 'light' : 'dark';
        try {
          window.localStorage.setItem(key, next);
        } catch {
          // Not remembered, still applied.
        }
        return next;
      }),
    []
  );
  return [theme, toggle];
};
