/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SVGProps } from 'react';
import React, { useId } from 'react';

// EUI has no document-with-pencil glyph, so this pairs its `document` outline with the pencil from `tablePencil`.
const DOCUMENT =
  'M3 2a1 1 0 0 1 1-1h4.707L13 5.293V14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V2Zm5 0H4v12h8V6H9a1 1 0 0 1-1-1V2Zm1 .707L11.293 5H9V2.707Z';
const PENCIL =
  'M13.37 8.225a1 1 0 0 1 1.337.068l1 1a1 1 0 0 1 0 1.414l-5 5A1 1 0 0 1 10 16H8v-2a1 1 0 0 1 .293-.707l5-5 .076-.068ZM9 14v1h1l3.646-3.646-1-1L9 14Zm4.354-4.354 1 1L15 10l-1-1-.646.646Z';

/** A document with a pencil over its corner, as an `EuiIcon` `type`. */
export const ComposeIcon = ({
  title,
  titleId,
  ...props
}: SVGProps<SVGSVGElement> & { title?: string; titleId?: string }) => {
  const mask = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={16}
      height={16}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-labelledby={titleId}
      {...props}>
      {title ? <title id={titleId}>{title}</title> : null}
      <mask id={mask}>
        <rect width="16" height="16" fill="#fff" />
        <path d={PENCIL} fill="#000" stroke="#000" strokeWidth="2" />
      </mask>
      <g mask={`url(#${mask})`}>
        <path d={DOCUMENT} transform="translate(-1 0)" />
      </g>
      <path d={PENCIL} />
    </svg>
  );
};
