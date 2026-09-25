/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { cls } from '../../render/cls';
import type { SlideReactEnv } from '../../render/context';
import { slideDistillery } from '../../theme/distillery';
import { placeholderModule } from '../../theme/modules';

import { embeddedLabel } from './embedded';
import { RenderPanel } from './panel';
import { renderModule } from './styles';
import type { SlideRenderNode } from './types';

const { separator } = slideDistillery.tokens.render;

/** React renderer for {@link SlideRenderNode}. */
export const react = (
  node: SlideRenderNode,
  { context, scope }: SlideReactEnv
): ReactNode => {
  const { handles: render } = renderModule;
  const { handles: placeholder } = placeholderModule;
  const { composition, surface, caption } = node;
  return (
    <figure className={cls(context, render.root)}>
      {caption ? (
        <figcaption className={cls(context, render.caption)}>
          {caption}
        </figcaption>
      ) : null}
      {composition ? (
        <RenderPanel
          body={composition.body}
          size={render.fit}
          slideScale={render.slideScale}
          outputScale={render.outputScale}
          {...{ surface, scope, context }}
        />
      ) : (
        <div className={cls(context, placeholder.root, render.fit)}>
          <span className={cls(context, placeholder.caption)}>
            {`${embeddedLabel(node)} ${separator.value} ${surface}`}
          </span>
        </div>
      )}
    </figure>
  );
};
