/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import { describe, expect, it } from 'vitest';

import { slidesPack } from '../../pack';

import { example } from './examples';
import { markdown, text } from './index';

const runtime = createIsomerRuntime({ packs: [slidesPack] });

describe('slideCycle', () => {
  it('draws one arrow per step', () => {
    const markup = renderToStaticMarkup(
      runtime.surfaces.react.renderNode(example)
    );
    expect(markup.match(/<path /g)).toHaveLength(example.nodes.length);
  });

  // The image backend parses an inline <svg> without the stylesheet
  // (`docs/primitives.md`), so every shape must carry its own literal paint.
  it('paints every shape with a literal attribute', () => {
    const markup = renderToStaticMarkup(
      runtime.surfaces.react.renderNode(example)
    );
    const shapes = markup.match(/<(circle|path) [^>]*>/g) ?? [];
    expect(shapes.length).toBeGreaterThan(0);
    for (const shape of shapes) {
      expect(shape).toMatch(/(fill|stroke)="#[0-9A-Fa-f]{6}"/);
      expect(shape).not.toContain('var(');
    }
  });

  it('closes the loop in text and markdown', () => {
    expect(text(example)).toContain(
      'Authoring context -> Model -> parse -> Errors -> Authoring context'
    );
    expect(markdown(example)).toContain('**Until it parses:**');
  });
});
