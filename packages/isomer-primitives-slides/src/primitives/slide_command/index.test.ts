/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderToStaticMarkup } from 'react-dom/server';
import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import {
  commandLineWidth,
  commandMaxLength,
} from '../../theme/components/command';
import { slideDistillery } from '../../theme/distillery';
import { monoWidth, sizeForWidth } from '../size';

import { SLIDE_COPY } from './copy';
import { example, examples, highlightExample } from './examples';
import { markdown, slack, text } from './index';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (...nodes: unknown[]): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: nodes } as PrimitiveNode],
});

const errorPaths = (node: unknown) =>
  runtime
    .validate(compose(node))
    .errors.map(({ path, message }) => `${path}: ${message}`);

const { prompt, textSizes } = slideDistillery.tokens.command;

describe('slideCommand schema', () => {
  it('validates every example', () => {
    for (const node of examples) {
      expect(errorPaths(node)).toEqual([]);
    }
  });

  it('rejects a multi-line command', () => {
    expect(
      errorPaths({ type: 'slideCommand', command: 'make\nmake install' })
    ).toEqual([
      'body[0].body[0].command: one line only: a multi-line command belongs in slideCode',
    ]);
  });

  it('rejects a highlight that does not start the command', () => {
    expect(
      errorPaths({ ...highlightExample, highlightPrefix: 'npm run' })
    ).toEqual([
      'body[0].body[0].highlightPrefix: highlightPrefix must start command',
    ]);
  });

  it('caps the command at a length that fits at the smallest step', () => {
    const longest = 'x'.repeat(commandMaxLength);
    expect(errorPaths({ type: 'slideCommand', command: longest })).toEqual([]);
    expect(
      errorPaths({ type: 'slideCommand', command: `${longest}x` })
    ).toHaveLength(1);
    expect(
      sizeForWidth(
        's',
        monoWidth(`${prompt.value}${longest}`),
        commandLineWidth,
        textSizes
      )
    ).toBe('s');
    expect(
      monoWidth(`${prompt.value}${longest}`) * parseFloat(textSizes.s.value)
    ).toBeLessThanOrEqual(commandLineWidth);
  });
});

describe('slideCommand output', () => {
  it('prints the prompt in text', () => {
    expect(text(example)).toMatchInlineSnapshot(`
      "Start the local store
      $ docker compose up --detach inventory"
    `);
  });

  it('fences the command without its prompt in markdown', () => {
    expect(markdown(example)).toMatchInlineSnapshot(`
      "**Start the local store**

      \`\`\`sh
      docker compose up --detach inventory
      \`\`\`"
    `);
  });

  it('puts the command in a Slack code block', () => {
    expect(slack(highlightExample)).toMatchInlineSnapshot(`
      [
        {
          "text": {
            "text": "\`\`\`
      REGION=eu-west-1 npm run refunds:replay -- --since 2026-03-01
      \`\`\`",
            "type": "mrkdwn",
          },
          "type": "section",
        },
      ]
    `);
  });
});

describe('slideCopy', () => {
  const anchor = 'data-isomer-node="slideCommand"';

  it('adds a Copy button, the anchor it finds the command by, and its script on the html surface when requested', () => {
    const { html, measurement } = runtime.surfaces.html.render(
      compose(example),
      { enhancements: [SLIDE_COPY] }
    );
    expect(html).toContain('<button');
    expect(html).toContain(anchor);
    expect(html).toContain('<script data-isomer-script');
    expect(measurement.js).toBeGreaterThan(0);
  });

  it('adds none of them without the request', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html).not.toContain('<button');
    expect(html).not.toContain(anchor);
    expect(html).not.toContain('<script>');
  });

  it('ships no script to a composition without a command', () => {
    const { html } = runtime.surfaces.html.render(
      compose({ type: 'slideHeading', title: 'Nothing to copy' }),
      { enhancements: [SLIDE_COPY] }
    );
    expect(html).not.toContain('<script>');
  });

  it('never draws the button on the svg surface', () => {
    const { element } = runtime.surfaces.svg.render(compose(example));
    expect(renderToStaticMarkup(element)).not.toContain('<button');
  });

  it('draws the button on the react surface only when the context has it', () => {
    const render = (enhancements: readonly string[]) =>
      renderToStaticMarkup(
        runtime.surfaces.react.render(compose(example), {
          context: { enhancements: new Set(enhancements) },
        })
      );
    expect(
      renderToStaticMarkup(runtime.surfaces.react.render(compose(example)))
    ).not.toContain('<button');
    expect(render([])).not.toContain('<button');
    expect(render([SLIDE_COPY])).toContain('<button');
  });
});
