/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// @vitest-environment jsdom

import { describe, expect, it } from 'vitest';

import { ancestors } from './scheme';

describe('ancestors', () => {
  it('continues through shadow hosts to the document element', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const root = host.attachShadow({ mode: 'open' });
    const section = document.createElement('section');
    const chart = document.createElement('div');
    section.append(chart);
    root.append(section);

    expect(ancestors(chart)).toEqual([
      chart,
      section,
      host,
      document.body,
      document.documentElement,
    ]);
  });
});
