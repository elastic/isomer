/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { marksReact, stripMarks } from '../../render/marks';
import { displayColumns } from '../../render/mono';
import { quoteFit } from '../../theme/components/quote';
import { slideDistillery } from '../../theme/distillery';
import { layoutModule } from '../../theme/modules';
import { sizeForLoad } from '../size';

import type { SlideQuoteNode } from './schema';
import { quoteModule } from './styles';

const { quoteOpen, quoteClose } = slideDistillery.tokens.quote;

/** React renderer for {@link SlideQuoteNode}. */
export const react = (
  { type, text, source, context: where, size }: SlideQuoteNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: quote } = quoteModule;
  const step = sizeForLoad(
    size,
    displayColumns(stripMarks(text)),
    quoteFit,
    context?.crowding
  );
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <figure className={cls(context, quote.root)}>
        <blockquote className={cls(context, quote.text, quote.textSize[step])}>
          {quoteOpen.value}
          {marksReact(text, context, 'primary')}
          {quoteClose.value}
        </blockquote>
        <figcaption className={cls(context, quote.attribution)}>
          <span aria-hidden className={cls(context, quote.rule)} />
          <span className={cls(context, quote.source)}>{source}</span>
          {where ? (
            <>
              {' '}
              <span className={cls(context, quote.context)}>{where}</span>
            </>
          ) : null}
        </figcaption>
      </figure>
    </div>
  );
};
