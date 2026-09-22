/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { slideModules } from '../../theme/modules';

import type { SlideTitleNode } from './schema';

const renderLedeReact = (lede: SlideTitleNode['lede']): ReactNode => {
  if (!lede) {
    return null;
  }
  if (typeof lede === 'string') {
    return <p>{lede}</p>;
  }
  return (
    <p>
      {lede.map((part, index) => {
        if (typeof part === 'string') {
          return <Fragment key={index}>{part}</Fragment>;
        }
        // `sanitize` already ran and drops an unsafe href to plain text, so
        // a `part` reaching here always carries a safe `href`.
        return (
          <a
            key={index}
            href={part.href}
            target={part.openInNewTab ? '_blank' : undefined}
            rel={part.openInNewTab ? 'noopener noreferrer' : undefined}>
            {part.text}
          </a>
        );
      })}
    </p>
  );
};

/** React renderer for {@link SlideTitleNode}. */
export const react = (
  node: SlideTitleNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: title } = slideModules.title;
  const { handles: tones } = slideModules.tones;
  return (
    <div
      className={cls(
        context,
        title.root,
        title.size[node.size ?? 'standard'],
        tones.tone[node.tone ?? 'primary']
      )}>
      {node.eyebrow ? (
        <div className={cls(context, title.eyebrow)}>{node.eyebrow}</div>
      ) : null}
      <h2>{node.title}</h2>
      {renderLedeReact(node.lede)}
    </div>
  );
};
