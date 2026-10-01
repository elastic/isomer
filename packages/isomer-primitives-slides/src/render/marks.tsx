/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Inline `code` and `**strong**` marks, parsed once and drawn per surface.

import type { ReactNode } from 'react';
import { type MarkdownInline, md } from '@elastic/isomer-sdk/markdown';
import {
  code,
  escapeMrkdwn,
  type SlackRichTextText,
} from '@elastic/isomer-sdk/slack';

import { marksModule } from '../theme/modules';

import { cls } from './cls';
import type { SlideRenderContext } from './context';
import { oneLine } from './one_line';

export interface MarkRun {
  kind: 'text' | 'code' | 'strong';
  text: string;
}

const markPattern = /`([^`]+)`|\*\*([^*]+?)\*\*/g;

/**
 * Unpaired markers stay literal.
 * Whitespace at a strong run's edges moves outside it, since Markdown and Slack read no emphasis whose delimiter touches a space.
 * A whitespace-only strong run stays literal.
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
      const core = strongText.trim();
      const start = strongText.length - strongText.trimStart().length;
      const lead = strongText.slice(0, start);
      const trail = strongText.slice(start + core.length);
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

/** For the text surface and fit estimates. */
export const stripMarks = (text: string): string =>
  parseMarks(text)
    .map(({ text: run }) => run)
    .join('');

export const hasLineTerminator = (text: string): boolean =>
  /[\n\r\u2028\u2029]/.test(text);

export const splitLines = (text: string): string[] =>
  text.split(/\r\n|[\n\r\u2028\u2029]/);

export const plainText = (text: string): string => oneLine(stripMarks(text));

/** Strong becomes `*bold*`. */
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

export const richTextRun = (
  text: string,
  style?: SlackRichTextText['style']
): SlackRichTextText => ({
  type: 'text',
  text: oneLine(text),
  ...(style ? { style } : {}),
});

export const marksRichText = (text: string): SlackRichTextText[] =>
  parseMarks(text).map(({ kind, text: run }) =>
    richTextRun(
      run,
      kind === 'code'
        ? { code: true }
        : kind === 'strong'
          ? { bold: true }
          : undefined
    )
  );

export const marksMarkdown = (text: string): MarkdownInline[] =>
  parseMarks(text).map(({ kind, text: run }) =>
    kind === 'code'
      ? md.code(run)
      : kind === 'strong'
        ? md.strong(run)
        : md.text(run)
  );

/** The whole text in strong; its own strong marks fold in rather than nest. */
export const strongMarksMarkdown = (text: string): MarkdownInline =>
  md.strong(
    ...parseMarks(text).map(({ kind, text: run }) =>
      kind === 'code' ? md.code(run) : md.text(run)
    )
  );

/** {@link marksRichText} with every run bold. */
export const strongMarksRichText = (text: string): SlackRichTextText[] =>
  marksRichText(text).map((run) => ({
    ...run,
    style: { ...run.style, bold: true },
  }));

/**
 * Strong is ink at bold weight, or underlined `primary` at the run's weight when `strong` is `'primary'`.
 * Then code is mono without its chip.
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
