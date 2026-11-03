/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import type { SlideContentNode } from './body_node';
import { slidePackDispatcher } from './dispatch';
import { frameModule } from './primitives/slide_frame/styles';
import { slideStylesheet } from './stylesheet';
import { isomerDeckRoot } from './theme/distillery';
import { deckRootModule } from './theme/modules';

/** Renders a single content node outside a `slideFrame`, inlining the stylesheet. */
export const StandaloneSlideNode = ({
  node,
}: {
  /** Content node to preview. */
  node: SlideContentNode;
}): ReactNode => {
  const { handles } = frameModule;
  return (
    <div
      className={`${isomerDeckRoot} ${deckRootModule.handles.root.readableName}`}>
      <style dangerouslySetInnerHTML={{ __html: slideStylesheet() }} />
      <section
        className={`${handles.slide.readableName} ${handles.standalone.readableName}`}>
        {slidePackDispatcher.renderReact(node)}
      </section>
    </div>
  );
};
