/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Inputs that must stay text wherever they land (elastic/isomer#23).
export const SAFE_INPUTS = [
  'line\nbreak',
  'carriage\rreturn',
  'crlf\r\nbreak',
  'line\u2028separator',
  'paragraph\u2029separator',
  'back\\slash',
  'trailing\\',
  '[x](javascript:alert(1))',
  '<img src=x onerror=alert(1)>',
  '<b>bold</b>',
  '*star* and _under_',
  '**strong** and __strong__',
  '~strike~ and ~~strike~~',
  '`tick` and ``ticks``',
  'a | b',
  '# heading',
  '- item',
  '+ item',
  '* item',
  '1. item',
  '1) item',
  '---',
  '===',
  '~~~',
  '```',
  '    indented',
  '> quote',
  '&amp; &#x41;',
  'wow![x](y)',
  '[^1] and [x]: https://a.b',
  '<https://a.b> and www.x.com',
];
