/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatSource } from './format_source';

describe('formatSource', () => {
  it('indents HTML and its inline CSS', async () => {
    const formatted = await formatSource(
      '<section class="isomer"><style>.a{color:red;margin:0}</style><div class="a"><span>Hi</span></div></section>',
      'html'
    );
    expect(formatted).toBe(
      [
        '<section class="isomer">',
        '  <style>',
        '    .a {',
        '      color: red;',
        '      margin: 0;',
        '    }',
        '  </style>',
        '  <div class="a"><span>Hi</span></div>',
        '</section>',
      ].join('\n')
    );
  });

  it('leaves other languages alone', async () => {
    expect(await formatSource('{"a":1}', 'json')).toBe('{"a":1}');
    expect(await formatSource('', 'html')).toBe('');
  });
});
