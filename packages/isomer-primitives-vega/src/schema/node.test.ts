/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vegaSchema } from './node';

const node = (spec: object) => ({
  type: 'vega',
  mode: 'vega',
  spec,
  description: 'A chart.',
});

const messages = (input: object) => {
  const result = vegaSchema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map(
        ({ path, message }) => `${path.join('.')}: ${message}`
      );
};

describe('vegaSchema', () => {
  it('reports a spec that cannot be written as JSON instead of throwing', () => {
    const marks: Record<string, unknown> = {};
    marks.self = marks;
    expect(messages(node({ marks }))).toContain(
      'spec: cannot be written as JSON'
    );
  });

  it('refuses a node whose spec throws once read, rather than passing it', () => {
    let reads = 0;
    const data = [{ name: 'a', url: 'https://example.com/a.json' }];
    const marks = {
      get type() {
        reads += 1;
        if (reads > 1) {
          throw new Error('hostile');
        }
        return 'rect';
      },
    };
    expect(messages(node({ marks: [marks], data }))).toEqual([
      ': threw while it was read',
    ]);
  });
});
