/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type { SlideReactEnv, SlideRenderContext } from '../../render/context';
import { marksReact } from '../../render/marks';
import { slideDistillery } from '../../theme/distillery';
import { labelModule, layoutModule } from '../../theme/modules';
import type { SlideBulletMarker } from '../../theme/variants';

import type { SlideBulletListNode } from './schema';
import { bulletsModule } from './styles';

const { crossGlyph } = slideDistillery.tokens.bullets;

const Marker = ({
  marker,
  context,
}: {
  marker: SlideBulletMarker;
  context: SlideRenderContext | undefined;
}): ReactNode => {
  const { handles: bullets } = bulletsModule;
  return (
    <span aria-hidden className={cls(context, bullets.marker)}>
      {marker === 'x' ? (
        <span className={cls(context, bullets.cross)}>{crossGlyph.value}</span>
      ) : (
        <span
          className={cls(
            context,
            marker === 'check' ? bullets.check : bullets.dot
          )}
        />
      )}
    </span>
  );
};

/** React renderer for {@link SlideBulletListNode}. */
export const react = (
  { type, items, label, marker = 'dot' }: SlideBulletListNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { handles: bullets } = bulletsModule;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <div className={cls(context, bullets.root)}>
        {label ? (
          <div
            className={cls(context, labelModule.handles.label, bullets.label)}>
            {label}
          </div>
        ) : null}
        <ul className={cls(context, bullets.list)}>
          {items.map((item, index) => (
            <li className={cls(context, bullets.item)} key={index}>
              <Marker {...{ marker, context }} />
              <span className={cls(context, bullets.text)}>
                {marksReact(item, context)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
