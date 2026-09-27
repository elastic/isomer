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

/** Every line terminator an authored one-line value must not carry. */
export const LINE_TERMINATORS = /\r\n|[\n\r\u2028\u2029]/g;

/** Whether `text` holds any of {@link LINE_TERMINATORS}. */
export const hasLineTerminator = (text: string): boolean =>
  /[\n\r\u2028\u2029]/.test(text);

/** Every ASCII character inline Markdown can read as syntax here; CommonMark lets each be backslash-escaped. */
const markdownSyntax = /[\\`*_[\]<>&|]/g;

const escapeMarkdownRun = (text: string): string =>
  text.replace(LINE_TERMINATORS, ' ').replace(markdownSyntax, '\\$&');

/**
 * Escapes what could open a block at the start of a value: a heading, quote,
 * list, thematic break, setext underline, or `~~~` fence, and an indent that
 * would start a code block.
 */
const escapeLeadingMarker = (markdown: string): string =>
  markdown
    .replace(/^\s+/, '')
    .replace(
      /^(?:(#{1,6}|-{3,}|={3,}|[+-])(?=\s|$)|(~{3,})|(\d{1,9})([.)])(?=\s|$))/,
      (
        _match,
        marker?: string,
        fence?: string,
        digits?: string,
        punctuation?: string
      ) =>
        marker !== undefined
          ? `\\${marker}`
          : fence !== undefined
            ? `\\${fence}`
            : `${digits ?? ''}\\${punctuation ?? ''}`
    );

/** Plain authored text as inline Markdown: line breaks become spaces, and nothing in it reads as Markdown syntax. */
export const markdownText = (text: string): string =>
  escapeLeadingMarker(escapeMarkdownRun(text));

/** `text` as inline Markdown: code spans and strong stay marks, and the rest is escaped as {@link markdownText} escapes it. */
export const marksMarkdown = (text: string): string =>
  escapeLeadingMarker(
    parseMarks(text)
      .map(({ kind, text: run }) =>
        kind === 'code'
          ? `\`${run.replace(LINE_TERMINATORS, ' ')}\``
          : kind === 'strong'
            ? `**${escapeMarkdownRun(run)}**`
            : escapeMarkdownRun(run)
      )
      .join('')
  );

/** `code` as an inline Markdown code span, fenced longer than any backtick run in it and kept on one line. */
export const markdownCode = (code: string): string => {
  const text = code.replace(LINE_TERMINATORS, ' ');
  const longest = Math.max(
    0,
    ...(text.match(/`+/g) ?? []).map((run) => run.length)
  );
  const fence = '`'.repeat(longest + 1);
  const pad = text.startsWith('`') || text.endsWith('`') ? ' ' : '';
  return `${fence}${pad}${text}${pad}${fence}`;
};

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
