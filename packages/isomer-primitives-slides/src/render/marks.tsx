/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Inline `code` and `**strong**` marks, parsed once and drawn per surface.

import type { ReactNode } from 'react';
import { oneLine } from '@elastic/isomer-sdk/author';
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

/**
 * Splits `text` into runs. Unpaired markers stay literal. Whitespace at a
 * strong run's edges moves outside it, since Markdown and Slack read no
 * emphasis whose delimiter touches a space, and a strong run of only
 * whitespace stays literal.
 */
export const parseMarks = (text: string): MarkRun[] => {
  const runs: MarkRun[] = [];
  const push = (run: MarkRun) => {
    const previous = runs.at(-1);
    if (run.text === '') {
      return;
    }
    if (run.kind === 'text' && previous?.kind === 'text') {
      previous.text += run.text;
    } else {
      runs.push(run);
    }
  };
  let last = 0;
  for (const match of text.matchAll(markPattern)) {
    const [whole, codeText, strongText = ''] = match;
    push({ kind: 'text', text: text.slice(last, match.index) });
    if (codeText !== undefined) {
      push({ kind: 'code', text: codeText });
    } else {
      const [, lead = '', core = '', trail = ''] =
        /^(\s*)([\s\S]*?)(\s*)$/.exec(strongText) ?? [];
      if (core === '') {
        push({ kind: 'text', text: whole });
      } else {
        push({ kind: 'text', text: lead });
        push({ kind: 'strong', text: core });
        push({ kind: 'text', text: trail });
      }
    }
    last = match.index + whole.length;
  }
  push({ kind: 'text', text: text.slice(last) });
  return runs;
};

/** `text` with its marks removed, for the text surface and for fit estimates. */
export const stripMarks = (text: string): string =>
  parseMarks(text)
    .map(({ text: run }) => run)
    .join('');

/** Every line terminator an authored one-line value must not carry. */
export const LINE_TERMINATORS = /\r\n|[\n\r\u2028\u2029]/g;

/** Whether `text` holds any of {@link LINE_TERMINATORS}. */
export const hasLineTerminator = (text: string): boolean =>
  /[\n\r\u2028\u2029]/.test(text);

/** `text` for the text surface: marks removed, on one line. */
export const plainText = (text: string): string => oneLine(stripMarks(text));

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
