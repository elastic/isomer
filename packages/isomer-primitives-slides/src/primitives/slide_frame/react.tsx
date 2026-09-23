/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Fragment, type ReactNode } from 'react';

import { cls } from '../../render/cls';
import type {
  SlideReactEnv,
  SlideRenderContext,
  SlideRenderScope,
} from '../../render/context';
import { isomerDeckRoot, slideDistillery } from '../../theme/distillery';
import { slideModules } from '../../theme/modules';

import {
  ELASTIC_LOGO_PATHS,
  ELASTIC_LOGO_STROKE,
  ISOMER_LOGO_PATHS,
} from './logo_marks';
import type { SlideFrameNode } from './types';

const LogoMark = ({
  small = false,
  context,
}: {
  small?: boolean;
  context: SlideRenderContext | undefined;
}): ReactNode => {
  const { handles: logo } = slideModules.logo;
  return (
    <svg
      aria-hidden
      className={cls(context, logo.logo, small ? logo.logoSmall : undefined)}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg">
      {ISOMER_LOGO_PATHS.map(({ d, fill }, index) => (
        <path key={index} {...{ d, fill }} />
      ))}
    </svg>
  );
};

const ElasticLogoMark = ({
  small = false,
  context,
}: {
  small?: boolean;
  context: SlideRenderContext | undefined;
}): ReactNode => {
  const { handles: logo } = slideModules.logo;
  return (
    <svg
      aria-hidden
      className={cls(
        context,
        logo.elastic,
        small ? logo.elasticSmall : undefined
      )}
      fill="none"
      viewBox="0 0 32 32"
      xmlns="http://www.w3.org/2000/svg">
      {ELASTIC_LOGO_PATHS.map((path, index) => (
        <path
          key={index}
          d={path.d}
          fill={path.fill}
          {...ELASTIC_LOGO_STROKE}
        />
      ))}
    </svg>
  );
};

/** React view for a {@link SlideFrameNode}, including chrome, body, and footer. */
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
  const layout = node.layout ?? 'content';
  const { handles: frame } = slideModules.frame;
  const { handles: deckRoot } = slideModules.deckRoot;
  return (
    <div className={`${isomerDeckRoot} ${cls(context, deckRoot.root)}`}>
      <section className={cls(context, frame.slide, frame.layout[layout])}>
        <div className={cls(context, frame.frame, frame.layout[layout])}>
          <header className={cls(context, frame.topbar)}>
            <div className={cls(context, frame.brand)}>
              <LogoMark context={context} />
              {node.brand ? <span>{node.brand}</span> : null}
            </div>
            <div className={cls(context, frame.chapter)}>
              {node.chapterNumber ? (
                <span className={cls(context, frame.chapterNumber)}>
                  {node.chapterNumber}
                </span>
              ) : null}
              {node.chapterNumber
                ? slideDistillery.tokens.frame.chapterSeparator.value
                : null}
              {node.chapter}
            </div>
          </header>
          <main className={cls(context, frame.body)}>
            {node.body.map((child, index) => (
              <Fragment key={index}>
                {scope.renderReact(child, context)}
              </Fragment>
            ))}
          </main>
          <footer className={cls(context, frame.footer)}>
            <span className={cls(context, frame.footerBrand)}>
              <ElasticLogoMark small context={context} />
              {slideDistillery.tokens.frame.brandLabel.value}
            </span>
            <span>{node.footer}</span>
          </footer>
        </div>
      </section>
    </div>
  );
};

/** Primitive React renderer; delegates to {@link SlideFrameView}. */
export const react = (
  node: SlideFrameNode,
  { context, scope }: SlideReactEnv
): ReactNode => <SlideFrameView {...{ node, context, scope }} />;
