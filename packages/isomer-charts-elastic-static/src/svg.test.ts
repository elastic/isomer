/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { drawExamples } from '@elastic/isomer-primitives-charts/testing';
import { JSDOM } from 'jsdom';
import { describe, expect, it } from 'vitest';

import {
  createElasticChartsStaticRenderer,
  drawScene,
  scopeSvgIds,
} from './svg';

const { drawn } = drawExamples([createElasticChartsStaticRenderer()]);

/** Every id `html` refers to by `url(#…)`, `href="#…"` or an ARIA id list, and the ids it holds. */
const references = (html: string) => {
  const { document } = new JSDOM(html).window;
  const ids = new Set(
    [...document.getElementsByTagName('*')].map((element) => element.id)
  );
  const referenced = [
    ...[...html.matchAll(/url\(#([^)]+)\)|href="#([^"]+)"/g)].map(
      ([, url, href]) => (url ?? href)!
    ),
    ...[...html.matchAll(/aria-(?:labelledby|describedby)="([^"]+)"/g)].flatMap(
      ([, list]) => list!.split(/\s+/)
    ),
  ];
  return { ids, referenced };
};

describe('scopeSvgIds', () => {
  it('prefixes ids and every reference to them, and leaves text alone', () => {
    expect(
      scopeSvgIds(
        '<svg><clipPath id="clip0"/><g clip-path="url(#clip0)"><use href="#clip0"/><text>url(#clip0)</text></g></svg><ul aria-labelledby="a b"><h2 id="a"></h2></ul>',
        's'
      )
    ).toBe(
      '<svg><clipPath id="s-clip0"/><g clip-path="url(#s-clip0)"><use href="#s-clip0"/><text>url(#clip0)</text></g></svg><ul aria-labelledby="s-a s-b"><h2 id="s-a"></h2></ul>'
    );
  });

  it.each(
    drawn.map(({ example, scheme, scene }) => ({ example, scheme, scene }))
  )(
    '$example ($scheme): every reference that resolved still resolves',
    ({ scene }) => {
      const { html } = drawScene(scene);
      const dangling = (markup: string) => {
        const { ids, referenced } = references(markup);
        return referenced.filter((id) => !ids.has(id));
      };
      const scope = /\bid="(ech[0-9a-z]+-)/.exec(html)?.[1];
      const unscoped = scope ? html.replaceAll(scope, '') : html;
      expect(dangling(html).length).toBe(dangling(unscoped).length);
    }
  );
});
