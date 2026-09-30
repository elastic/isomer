/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createIsomerRuntime } from '@elastic/isomer-runtime';
import type { Composition, PrimitiveNode } from '@elastic/isomer-sdk';
import { serializeMarkdown } from '@elastic/isomer-sdk/markdown';
import { describe, expect, it } from 'vitest';

import { slideDeckFrame, slidesPack } from '../../pack';
import { slideDistillery } from '../../theme/distillery';
import { expectCountBounds } from '../bounds.fixtures';

import { example, pairExample, wideExample } from './examples';
import { markdown as markdownContent, slack, text } from './index';
import { schema } from './schema';

const runtime = createIsomerRuntime({
  packs: [slidesPack],
  frames: { slide: slideDeckFrame },
});

const compose = (node: object): Composition => ({
  type: 'view',
  body: [{ type: 'slideFrame', body: [node] } as PrimitiveNode],
});

const markdown = (node: Parameters<typeof markdownContent>[0]): string =>
  serializeMarkdown(markdownContent(node));

describe('slideFanout', () => {
  it('holds two to six targets in the two tones', () => {
    const paths = (node: object) =>
      runtime.validate(compose(node)).errors.map(({ path }) => path);
    expect(
      paths({ ...example, targets: example.targets.slice(0, 1) })
    ).toContain('body[0].body[0].targets');
    expect(
      paths({
        ...example,
        targets: [{ name: 'a', body: 'b', tone: 'teal' }, example.targets[0]],
      })
    ).toContain('body[0].body[0].targets[0].tone');
  });

  it('names the branch for assistive technology', () => {
    const { html } = runtime.surfaces.html.render(compose(example));
    expect(html).toContain(
      `role="img" aria-label="${slideDistillery.tokens.connector.label.value}"`
    );
  });

  it('renders text, markdown, and Slack', () => {
    expect(text(pairExample)).toMatchInlineSnapshot(`
      "release tag →
        changelog: Drafted from merged pull requests
        registry: Receives the signed build"
    `);
    expect(markdown(pairExample)).toMatchInlineSnapshot(`
      "**release tag** →

      - **changelog**: Drafted from merged pull requests
      - **registry**: Receives the signed build"
    `);
    expect(slack(pairExample)).toMatchInlineSnapshot(`
      [
        {
          "elements": [
            {
              "elements": [
                {
                  "style": {
                    "bold": true,
                  },
                  "text": "release tag",
                  "type": "text",
                },
                {
                  "text": " →",
                  "type": "text",
                },
              ],
              "type": "rich_text_section",
            },
            {
              "elements": [
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "changelog",
                      "type": "text",
                    },
                    {
                      "text": ": ",
                      "type": "text",
                    },
                    {
                      "text": "Drafted from merged pull requests",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
                {
                  "elements": [
                    {
                      "style": {
                        "bold": true,
                      },
                      "text": "registry",
                      "type": "text",
                    },
                    {
                      "text": ": ",
                      "type": "text",
                    },
                    {
                      "text": "Receives the signed build",
                      "type": "text",
                    },
                  ],
                  "type": "rich_text_section",
                },
              ],
              "style": "bullet",
              "type": "rich_text_list",
            },
          ],
          "type": "rich_text",
        },
      ]
    `);
  });
});

describe('slideFanout counts and tones', () => {
  it('holds two to six targets, as its widest example does', () => {
    expectCountBounds(
      schema,
      example,
      'targets',
      [2, 6],
      { name: 'a', body: 'b' },
      wideExample
    );
  });

  it('marks a toned target on every surface, not by color alone', () => {
    const toned = {
      ...pairExample,
      targets: [
        { ...pairExample.targets[0]!, tone: 'primary' as const },
        pairExample.targets[1]!,
      ],
    };
    const glyph = slideDistillery.tokens.tone.glyph.primary.value;
    const label = slideDistillery.tokens.fanout.toneLabel.primary.value;
    expect(text(toned)).toContain(`${glyph} changelog`);
    expect(markdown(toned)).toContain(`${glyph} **changelog**`);
    expect(JSON.stringify(slack(toned))).toContain(glyph);
    expect(
      runtime.surfaces.html.render({
        type: 'view',
        body: [{ type: 'slideFrame', body: [toned] } as PrimitiveNode],
      }).html
    ).toContain(`aria-label="${label}"`);
  });
});
