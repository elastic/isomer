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
import { marksReact } from '../../render/marks';
import { ToneCue } from '../../render/tone_cue';
import { labelModule, layoutModule, tonesModule } from '../../theme/modules';

import { layersStep } from './fit';
import type { SlideLayersNode } from './schema';
import { layersModule } from './styles';

/** React renderer for {@link SlideLayersNode}. */
export const react = (
  node: SlideLayersNode,
  { context }: SlideReactEnv
): ReactNode => {
  const { type, layers } = node;
  const { handles: style } = layersModule;
  const { handles: label } = labelModule;
  const { handles: tones } = tonesModule;
  const step = layersStep(node, context);
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={cls(context, layoutModule.handles.fill)}>
      <ol className={cls(context, style.list, style.listSize[step])}>
        {layers.map(({ name, body, chips, owner, tone }, index) => (
          <li
            className={cls(context, style.band, style.bandSize[step])}
            key={index}>
            <strong className={cls(context, style.name, style.nameSize[step])}>
              {name}
            </strong>
            {chips ? (
              <ul className={cls(context, style.chips)}>
                {chips.map((chip, chipIndex) => (
                  <li
                    className={cls(context, style.chip, style.chipSize[step])}
                    key={chipIndex}>
                    {chip}
                  </li>
                ))}
              </ul>
            ) : (
              <p className={cls(context, style.body, style.bodySize[step])}>
                {marksReact(body ?? '', context)}
              </p>
            )}
            <span
              className={cls(
                context,
                label.label,
                style.owner,
                ...(tone ? [tones.tone[tone], label.toned] : [])
              )}>
              <ToneCue {...{ tone, context }} />
              {owner}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};
