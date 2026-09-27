/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';
import { nodeAnchor } from '@elastic/isomer-sdk';

import { cls } from '../../render/cls';
import type {
  SlideReactEnv,
  SlideRenderContext,
  SlideRenderScope,
} from '../../render/context';
import { LogoMark } from '../../render/logo';
import { isomerDeckRoot, slideDistillery } from '../../theme/distillery';
import { deckRootModule } from '../../theme/modules';
import { headingCrowding } from '../slide_heading/fit';

import { frameModule } from './styles';
import type { SlideFrameNode } from './types';

const { separator } = slideDistillery.tokens.frame;

const Footer = ({
  node,
  context,
}: {
  node: SlideFrameNode;
  context: SlideRenderContext | undefined;
}): ReactNode => {
  const { handles: frame } = frameModule;
  const { brand, section, sectionNumber, url, logo = true } = node;
  const sectionLine = [sectionNumber, section].filter(Boolean).join(' ');
  return (
    <footer className={cls(context, frame.footer)}>
      <div className={cls(context, frame.footerStart)}>
        {logo ? <LogoMark className={cls(context, frame.logo)} /> : null}
        {brand ? (
          <span
            {...(sectionLine ? { className: cls(context, frame.brand) } : {})}>
            {brand}
          </span>
        ) : null}
        {brand && sectionLine ? <span>{separator.value}</span> : null}
        {sectionLine ? <span>{sectionLine}</span> : null}
      </div>
      {url ? (
        <a className={cls(context, frame.url)} href={url}>
          {url.replace(/^https?:\/\//, '')}
        </a>
      ) : null}
    </footer>
  );
};

/** React view for a {@link SlideFrameNode}: body and footer on the fixed canvas. */
export const SlideFrameView = ({
  node,
  context,
  scope,
}: {
  /** Frame to render. */
  node: SlideFrameNode;
  /** Distillate class-name context; absent in standalone previews. */
  context: SlideRenderContext | undefined;
  /** Dispatches nested body nodes on the React surface. */
  scope: SlideRenderScope;
}): ReactNode => {
  const { handles: frame } = frameModule;
  const { handles: deckRoot } = deckRootModule;
  const { type, body, tone, logo } = node;
  const [first] = body;
  const inside: SlideRenderContext | undefined =
    logo === false ? { ...context, logo } : context;
  const below: SlideRenderContext | undefined =
    first?.type === 'slideHeading'
      ? {
          ...inside,
          crowding: headingCrowding(first),
        }
      : inside;
  return (
    <div
      {...nodeAnchor(context, { type })}
      className={`${isomerDeckRoot} ${cls(context, deckRoot.root)}`}>
      <section
        className={cls(context, frame.slide, frame.tone[tone ?? 'page'])}>
        <main className={cls(context, frame.body)}>
          {body.map((child, index) => (
            <Fragment key={index}>
              {scope.renderReact(child, index === 0 ? inside : below)}
            </Fragment>
          ))}
        </main>
        <Footer {...{ node, context }} />
      </section>
    </div>
  );
};

/** Primitive React renderer; delegates to {@link SlideFrameView}. */
export const react = (
  node: SlideFrameNode,
  { context, scope }: SlideReactEnv
): ReactNode => <SlideFrameView {...{ node, context, scope }} />;
