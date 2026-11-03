/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { queryParams } from './params';

describe('queryParams', () => {
  it.each([
    ['FROM logs', []],
    [
      'FROM logs | WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend',
      ['_tstart', '_tend'],
    ],
    ['FROM logs | WHERE a == ?x OR b == ?x', ['x']],
    ['FROM logs | STATS ??fn(?x) BY ??field', ['fn', 'x', 'field']],
    ['FROM logs | WHERE msg == "?not" AND x == ?yes', ['yes']],
    ['FROM logs | WHERE msg == "a \\" ?no" AND x == ?yes', ['yes']],
    ['FROM logs | WHERE msg == """?no "" ?no""" | KEEP ?yes', ['yes']],
    ['FROM logs | KEEP `?no` | WHERE x == ?yes', ['yes']],
    ['FROM logs // ?no\n| WHERE x == ?yes /* ?no */', ['yes']],
    ['FROM logs // ?no\r| WHERE x == ?yes', ['yes']],
    ['FROM logs /* outer /* inner */ ?no */ | KEEP ?yes', ['yes']],
  ])('finds the named parameters in %j', (esql, names) => {
    expect(queryParams(esql)).toEqual({ ok: true, names });
  });

  it.each([
    ['FROM logs | WHERE x == ?', 'unnamed'],
    ['FROM logs | WHERE x == ? AND y == ?y', 'unnamed'],
    ['FROM logs | STATS ??fn(?1) BY ??field', 'positional'],
    ['FROM logs | WHERE msg == "unterminated ?no', 'syntax'],
    ['FROM logs | WHERE', 'syntax'],
  ])('refuses %j as %s', (esql, reason) => {
    expect(queryParams(esql)).toMatchObject({ ok: false, reason });
  });
});
