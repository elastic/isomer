/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'isomer-studio:nav-closed-groups';

const storedClosed = (): ReadonlySet<string> => {
  try {
    const parsed: unknown = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? '[]'
    );
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((title): title is string => typeof title === 'string')
        : []
    );
  } catch {
    return new Set();
  }
};

/** Which nav groups the user closed, persisted per browser; every group starts open. */
export const useClosedNavGroups = (): {
  closed: ReadonlySet<string>;
  setOpen: (title: string, isOpen: boolean) => void;
} => {
  const [closed, setClosed] = useState(storedClosed);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...closed]));
    } catch {
      // Storage is optional: a blocked or full store keeps the state for this page only.
    }
  }, [closed]);

  const setOpen = useCallback((title: string, isOpen: boolean) => {
    setClosed((current) => {
      if (current.has(title) !== isOpen) {
        return current;
      }
      const next = new Set(current);
      if (isOpen) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  }, []);

  return { closed, setOpen };
};
