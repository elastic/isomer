/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';

const { createStyleModule, tokens } = slideDistillery;
const { color, frame, render } = tokens;
const { placeholder } = render;

/** `slideRender`, and the panel and placeholder its siblings share. */
export const renderModule = createStyleModule('render', ({ css }) => ({
  root: css`
    align-self: center;
    display: flex;
    flex: 0 0 auto;
    flex-direction: column;
    gap: ${render.captionGap};
    margin: 0;
    min-width: 0;
    width: 100%;
  `,
  caption: css`
    color: ${color.textSubtle};
    ${typeRole(render.caption)}
    margin: 0;
  `,
  /** 16:9, at the width of the slide drawn in it. */
  fit: css`
    aspect-ratio: ${render.panel.aspect};
    box-sizing: border-box;
    flex: 0 0 auto;
    width: 100%;
  `,
  panel: css`
    background: ${color.bgSurface};
    border: ${render.panel.border} solid ${color.border};
    border-radius: ${render.panel.radius};
    box-sizing: border-box;
    min-height: 0;
    min-width: 0;
    overflow: hidden;
    position: relative;
  `,
  slide: css`
    background: ${color.bgPage};
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: ${render.slide.height};
    left: 50%;
    margin-left: ${render.slide.offsetX};
    margin-top: ${render.slide.offsetY};
    position: absolute;
    top: 50%;
    width: ${render.slide.width};
  `,
  /** Frame spacing for an embedded body that is not itself a `slideFrame`. */
  bare: css`
    gap: ${frame.bodyGap};
    padding: ${frame.paddingTop} ${frame.paddingX} ${frame.paddingBottom};
  `,
  output: css`
    box-sizing: border-box;
    color: ${color.text};
    display: flex;
    flex-direction: column;
    ${typeRole(render.output)}
    left: 0;
    padding: ${render.outputPadding};
    position: absolute;
    top: 0;
  `,
  outputScale: css`
    width: 100%;
  `,
  line: css`
    min-height: ${render.outputLine};
    overflow: hidden;
    white-space: pre;
  `,
  placeholder: css`
    align-items: center;
    background: repeating-linear-gradient(
      ${placeholder.angle},
      ${color.placeholderStripe} 0 ${placeholder.stripe},
      ${color.bgPage} ${placeholder.stripe} ${placeholder.stripeEnd}
    );
    border: ${placeholder.border} dashed ${color.borderDashed};
    border-radius: ${render.panel.radius};
    display: flex;
    justify-content: center;
    min-height: 0;
    min-width: 0;
  `,
  placeholderCaption: css`
    background: ${color.bgPage};
    border-radius: ${placeholder.captionRadius};
    color: ${color.textSubtle};
    ${typeRole(render.caption)}
    padding: ${placeholder.captionPadding};
  `,
}));
