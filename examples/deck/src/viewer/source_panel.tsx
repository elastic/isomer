/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useState } from 'react';

import type { SlideSource, SourceId } from './types';

/** A slide's sources beside the stage, one tab per format. */
export const SourcePanel = ({
  sources,
  active,
  onSelect,
  onClose,
}: {
  sources: readonly SlideSource[];
  active: SourceId;
  onSelect: (id: SourceId) => void;
  onClose: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const source = sources.find(({ id }) => id === active) ?? sources[0];
  if (!source) {
    return null;
  }
  return (
    <aside aria-label="Source" className="source-panel">
      <div className="source-bar">
        <div aria-label="Source format" className="source-tabs" role="tablist">
          {sources.map(({ id, label }) => (
            <button
              aria-selected={id === source.id}
              key={id}
              onClick={() => onSelect(id)}
              role="tab"
              type="button">
              {label}
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            void navigator.clipboard.writeText(source.text).then(() => {
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1500);
            });
          }}
          type="button">
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button
          aria-label="Close source"
          onClick={onClose}
          title="Close (s)"
          type="button">
          ×
        </button>
      </div>
      {source.file ? (
        <p className="source-file">
          <code>{source.file}</code>
        </p>
      ) : null}
      <pre className="source-code">
        <code>{source.text}</code>
      </pre>
    </aside>
  );
};
