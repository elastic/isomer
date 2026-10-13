/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import config from '../isomer-studio.config';

import { example as frameExample } from './primitives/slide_frame/examples';
import { example as headingExample } from './primitives/slide_heading/examples';

const { runtime, compose } = config;

describe('the slides Studio config', () => {
  it('composes a slideHeading example into one valid slide that every surface renders', () => {
    const composition = compose?.([headingExample], { theme: 'dark' });
    if (!composition) {
      throw new Error('The slides config has a compose.');
    }

    expect(runtime.validate(composition).errors).toEqual([]);
    expect(composition.theme).toBe('dark');
    expect(composition.body.map(({ type }) => type)).toEqual(['slideFrame']);

    const { surfaces } = runtime;
    const { title } = headingExample;
    expect(surfaces.html.render(composition).html).toContain(title);
    expect(surfaces.markdown.render(composition)).toContain(title);
    expect(surfaces.text.render(composition).toLowerCase()).toContain(
      title.toLowerCase()
    );
    expect(JSON.stringify(surfaces.slack.render(composition).blocks)).toContain(
      title
    );
    expect(surfaces.snapshot?.render(composition).html).toContain(title);
  });

  it('passes a slideFrame example through without a second frame', () => {
    const composition = compose?.([frameExample], { theme: 'light' });

    expect(composition?.body).toEqual([frameExample]);
    expect(composition && runtime.validate(composition).errors).toEqual([]);
  });
});
