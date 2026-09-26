/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Inline `code` and `**strong**` marks, parsed once and drawn per surface.

import type { ReactNode } from 'react';
import { code, escapeMrkdwn } from '@elastic/isomer-sdk/slack';

import { marksModule } from '../theme/modules';

import { cls } from './cls';
import type { SlideRenderContext } from './context';

/** One run of authored text: plain, inline code, or strong. */
export interface MarkRun {
  kind: 'text' | 'code' | 'strong';
  text: string;
}

const markPattern = /`([^`\n]+)`|\*\*([^*\n]+?)\*\*/g;

/** Splits `text` into runs. Unpaired markers stay literal. */
export const parseMarks = (text: string): MarkRun[] => {
  const runs: MarkRun[] = [];
  let last = 0;
  for (const match of text.matchAll(markPattern)) {
    const [whole, codeText, strongText] = match;
    if (match.index > last) {
      runs.push({ kind: 'text', text: text.slice(last, match.index) });
    }
    runs.push(
      codeText !== undefined
        ? { kind: 'code', text: codeText }
        : { kind: 'strong', text: strongText ?? '' }
    );
    last = match.index + whole.length;
  }
  if (last < text.length) {
    runs.push({ kind: 'text', text: text.slice(last) });
  }
  return runs;
};

/** `text` with its marks removed, for the text surface and for fit estimates. */
export const stripMarks = (text: string): string =>
  parseMarks(text)
    .map(({ text: run }) => run)
    .join('');

/** `text` as Slack mrkdwn: code spans stay code, strong becomes `*bold*`, the rest is escaped. */
export const marksSlack = (text: string): string =>
  parseMarks(text)
    .map(({ kind, text: run }) =>
      kind === 'code'
        ? code(run)
        : kind === 'strong'
          ? `*${escapeMrkdwn(run)}*`
          : escapeMrkdwn(run)
    )
    .join('');

/**
 * `text` as React runs. Strong is ink at the bold weight, or primary at the
 * run's own weight when `strong` is `'primary'`, where code is mono without its chip.
 */
export const marksReact = (
  text: string,
  context: SlideRenderContext | undefined,
  strong: 'ink' | 'primary' = 'ink'
): ReactNode => {
  const runs = parseMarks(text);
  if (runs.every(({ kind }) => kind === 'text')) {
    return text;
  }
  const { handles } = marksModule;
  return runs.map(({ kind, text: run }, index) =>
    kind === 'code' ? (
      <code
        className={cls(
          context,
          strong === 'primary' ? handles.displayCode : handles.code
        )}
        key={index}>
        {run}
      </code>
    ) : kind === 'strong' ? (
      <strong
        className={cls(
          context,
          strong === 'primary' ? handles.strongPrimary : handles.strong
        )}
        key={index}>
        {run}
      </strong>
    ) : (
      run
    )
  );
};
