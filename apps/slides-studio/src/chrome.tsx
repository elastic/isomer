/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type ReactNode, useState } from 'react';

import { Link } from './router';

/** The studio's top bar: the brand, then whatever the page adds. */
export const TopBar = ({ children }: { children?: ReactNode }) => (
  <header className="toolbar studio-bar">
    <Link className="brand" href="/">
      <img alt="" height={20} src="/logo.svg" width={20} />
      Isomer studio
    </Link>
    {children}
  </header>
);

/** A command or prompt with a button that copies it. A command scrolls rather than wraps, so it reads as it pastes. */
export const Copyable = ({
  label,
  text,
  wrap = false,
}: {
  label: string;
  text: string;
  wrap?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  return (
    <div className={wrap ? 'copyable wrap' : 'copyable'}>
      <pre>
        <code>{text}</code>
      </pre>
      <button
        aria-label={`Copy ${label}`}
        onClick={() => {
          void navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1500);
          });
        }}
        type="button">
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
};
