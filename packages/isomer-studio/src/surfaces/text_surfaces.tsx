/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCodeBlock, EuiMarkdownFormat } from '@elastic/eui';

import { formatSource } from './format_source';
import type { SurfaceOutput } from './render_output';

/** Markdown as a reader sees it. */
export const MarkdownSurface = ({ markdown }: { markdown: string }) => (
  <EuiMarkdownFormat textSize="s">{markdown}</EuiMarkdownFormat>
);

/** Plain text, which looks the same rendered as it does as source. */
export const TextSurface = ({ text }: { text: string }) => (
  <EuiCodeBlock
    language="text"
    fontSize="m"
    paddingSize="none"
    transparentBackground>
    {text}
  </EuiCodeBlock>
);

/** A surface's output as source, formatted once the formatter has loaded. */
export const SourceView = ({
  output: { source, language },
}: {
  output: SurfaceOutput;
}) => {
  const [formatted, setFormatted] = useState<{
    source: string;
    text: string;
  }>();

  useEffect(() => {
    let isCurrent = true;
    void formatSource(source, language).then((text) => {
      if (isCurrent) {
        setFormatted({ source, text });
      }
    });
    return () => {
      isCurrent = false;
    };
  }, [source, language]);

  return (
    <EuiCodeBlock
      language={language}
      fontSize="s"
      paddingSize="s"
      isCopyable
      overflowHeight={480}>
      {formatted?.source === source ? formatted.text : source}
    </EuiCodeBlock>
  );
};
