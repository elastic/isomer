/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiCode } from '@elastic/eui';

const escape = (name: string) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** `text` split into prose and code: backtick spans, and any of `names` standing as a whole word. */
export const splitCode = (
  text: string,
  names: readonly string[] = []
): Array<{ text: string; isCode: boolean }> => {
  const words = names.length
    ? new RegExp(`\\b(${names.map(escape).join('|')})\\b`, 'g')
    : undefined;
  return text
    .split(/`([^`]+)`/)
    .flatMap((part, index) =>
      index % 2 === 1
        ? [{ text: part, isCode: true }]
        : (words ? part.split(words) : [part]).flatMap((piece, pieceIndex) =>
            piece ? [{ text: piece, isCode: pieceIndex % 2 === 1 }] : []
          )
    );
};

/** Prose with its backtick spans and primitive names set as inline code. */
export const InlineCode = ({
  text,
  names,
}: {
  text: string;
  names?: readonly string[];
}) => (
  <>
    {splitCode(text, names).map(({ text: part, isCode }, index) =>
      isCode ? (
        <EuiCode key={index}>{part}</EuiCode>
      ) : (
        <React.Fragment key={index}>{part}</React.Fragment>
      )
    )}
  </>
);
