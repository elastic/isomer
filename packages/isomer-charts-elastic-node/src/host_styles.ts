/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The page Elastic Charts expects to sit in. In Kibana every chart inherits
// EUI's global styles: its reset (`global_styling/reset/reset`) and the body
// font on `html` (`global_styling/reset/global_styles`). Elastic Charts'
// legends, metric tiles and tooltips are DOM laid out by those styles; without
// them text takes user-agent margins and line heights that clip descenders.

/** EUI's global reset, adapted from Eric Meyer's, whitespace collapsed. */
export const EUI_RESET =
  "*,*:before,*:after{box-sizing: border-box;}html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{margin: 0;padding: 0;border: none;vertical-align: baseline;}h1,h2,h3,h4,h5,h6,p{font-family: inherit;font-weight: inherit;font-size: inherit;}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display: block;}a[href],button,[role='button']{cursor: pointer;}button{background: none;border: none;padding: 0;margin: 0;color: inherit;border-radius: 0;font-size: inherit;}input{margin: 0;padding: 0;}input:disabled{opacity: 1;}ol,ul{list-style: none;}blockquote,q{quotes: none;}blockquote:before,blockquote:after,q:before,q:after{content: '';}table{border-collapse: collapse;border-spacing: 0;}hr{margin: 0;}fieldset{min-inline-size: auto;}svg text{letter-spacing: normal !important;}";

/** EUI Borealis' body font as `global_styles` sets it on `html`, at its 16-pixel base. */
export const EUI_BODY_FONT = {
  family: "'Inter', BlinkMacSystemFont, Helvetica, Arial, sans-serif",
  /** `font.scale.s`, the body scale, times the base. */
  size: 14,
  /** `base / (scale * base)`. */
  lineHeight: 16 / 14,
  /** `font.weight.regular`. */
  weight: 400,
} as const;

const ROOT = '.echChart';

/** Each rule's selectors under `root`, at the zero specificity EUI's unscoped reset has over a chart's own rules. */
export const scopeCss = (css: string, root: string): string =>
  css.replace(/([^{}]+)\{([^{}]*)\}/g, (_, selectors: string, body: string) => {
    const scoped = selectors
      .split(',')
      .map((selector) => selector.trim())
      .filter(Boolean)
      .map((selector) => `:where(${root}) ${selector}`)
      .join(',');
    return `${scoped}{${body.trim()}}`;
  });

/** EUI's reset and body font, scoped to the chart, as Kibana's page gives every chart. */
export const euiHostStyles = (): string => {
  const { family, size, lineHeight, weight } = EUI_BODY_FONT;
  const font = [
    `font-family:${family}`,
    `font-size:${size}px`,
    `line-height:${lineHeight}`,
    `font-weight:${weight}`,
    'font-kerning:normal',
  ].join(';');
  return `:where(${ROOT}){${font}}${scopeCss(EUI_RESET, ROOT)}`;
};
