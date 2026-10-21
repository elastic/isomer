/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposeFormat } from './compose_link';
import { sha256Hex } from './sha256';

const DRAFT_KEY = 'isomer-studio:composition-draft';
const TRUSTED_KEY = 'isomer-studio:trusted-sources';
const MAX_TRUSTED = 20;

export interface StoredDraft {
  source: string;
  format: ComposeFormat;
}

const storage = (
  kind: 'localStorage' | 'sessionStorage'
): Storage | undefined => {
  try {
    return typeof window === 'undefined' ? undefined : window[kind];
  } catch {
    return undefined;
  }
};

const read = (store: Storage | undefined, key: string): unknown => {
  try {
    const text = store?.getItem(key);
    return text ? JSON.parse(text) : undefined;
  } catch {
    return undefined;
  }
};

const write = (store: Storage | undefined, key: string, value: unknown) => {
  try {
    store?.setItem(key, JSON.stringify(value));
  } catch {
    // Storage is full or disabled; the draft still lives in the URL.
  }
};

const isStoredDraft = (value: unknown): value is StoredDraft =>
  typeof value === 'object' &&
  value !== null &&
  'source' in value &&
  typeof value.source === 'string' &&
  'format' in value &&
  (value.format === 'jsx' || value.format === 'json');

/** The composition editor's last draft in this browser, which this user typed or ran. */
export const loadDraft = (): StoredDraft | undefined => {
  const value = read(storage('localStorage'), DRAFT_KEY);
  return isStoredDraft(value) ? value : undefined;
};

/** Keeps `draft` for {@link loadDraft}. Only store source the user typed or chose to run. */
export const saveDraft = (draft: StoredDraft): void =>
  write(storage('localStorage'), DRAFT_KEY, draft);

const fingerprint = ({ source, format }: StoredDraft): string =>
  sha256Hex(new TextEncoder().encode(`${format}\n${source}`));

const trustedList = (): string[] => {
  const value = read(storage('sessionStorage'), TRUSTED_KEY);
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
};

/**
 * Marks source this tab wrote, so a link to it, such as the editor's own URL after a reload,
 * runs without asking. Kept per tab, so a link opened anew is still asked about.
 */
export const rememberTrusted = (draft: StoredDraft): void => {
  const key = fingerprint(draft);
  const list = trustedList().filter((item) => item !== key);
  write(
    storage('sessionStorage'),
    TRUSTED_KEY,
    [key, ...list].slice(0, MAX_TRUSTED)
  );
};

/** Whether this tab wrote `draft`; see {@link rememberTrusted}. */
export const isTrusted = (draft: StoredDraft): boolean =>
  trustedList().includes(fingerprint(draft));
