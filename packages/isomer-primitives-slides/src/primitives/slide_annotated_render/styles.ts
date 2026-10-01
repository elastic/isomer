/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { variants } from '@elastic/distillate';

import { slideDistillery } from '../../theme/distillery';
import { typeRole } from '../../theme/type_role';
import { slideSizes } from '../../theme/variants';

const { createStyleModule, tokens } = slideDistillery;
const { annotatedRender, color, render } = tokens;
const { legend, pin } = annotatedRender;

export const annotatedRenderModule = createStyleModule(
  'annotatedRender',
  ({ css }) => ({
    grid: css`
      align-items: center;
      display: grid;
      gap: ${annotatedRender.gap};
      grid-template-columns: ${annotatedRender.columns};
    `,
    // Inset by a pin's overhang, so a pin on the panel's edge stays inside the figure.
    figure: css`
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      gap: ${render.captionGap};
      justify-self: center;
      margin: 0;
      min-width: 0;
      padding: 0 ${pin.overhang};
      width: 100%;
    `,
    // Holds the panel alone, at its width, so pins place against the slide and not the caption.
    stage: css`
      margin: ${pin.overhang} 0;
      position: relative;
    `,
    fit: css`
      aspect-ratio: ${render.panel.aspect};
      box-sizing: border-box;
      flex: 0 0 auto;
      width: 100%;
    `,
    pin: css`
      align-items: center;
      background: ${color.primary};
      border: ${pin.ring} solid ${color.bgPage};
      border-radius: 50%;
      box-sizing: border-box;
      color: ${color.onPrimary};
      display: flex;
      font-size: ${pin.numeral.size};
      font-weight: ${pin.numeral.weight};
      height: ${pin.size};
      justify-content: center;
      position: absolute;
      transform: translate(-50%, -50%);
      width: ${pin.size};
    `,
    legend: css`
      border-top: ${legend.rule} solid ${color.border};
      display: flex;
      flex-direction: column;
      list-style: none;
      margin: 0;
      min-width: 0;
      padding: 0;
    `,
    item: css`
      border-bottom: ${legend.rule} solid ${color.border};
      display: grid;
      gap: ${legend.columnGap};
      grid-template-columns: ${legend.marker} minmax(0, 1fr);
    `,
    itemStep: variants(
      slideSizes,
      (size) => css`
        padding: ${legend.steps[size].padding} 0;
      `
    ),
    disc: css`
      align-items: center;
      background: ${color.primary};
      border-radius: 50%;
      color: ${color.onPrimary};
      display: flex;
      font-size: ${legend.numeral.size};
      font-weight: ${legend.numeral.weight};
      height: ${legend.disc};
      justify-content: center;
      width: ${legend.disc};
    `,
    copy: css`
      display: flex;
      flex-direction: column;
      gap: ${legend.textGap};
      min-width: 0;
    `,
    title: css`
      color: ${color.text};
      ${typeRole(legend.title)}
    `,
    titleStep: variants(
      slideSizes,
      (size) => css`
        font-size: ${legend.steps[size].title};
      `
    ),
    body: css`
      color: ${color.textSoft};
      ${typeRole(legend.body)}
    `,
    bodyStep: variants(
      slideSizes,
      (size) => css`
        font-size: ${legend.steps[size].body};
      `
    ),
  })
);
