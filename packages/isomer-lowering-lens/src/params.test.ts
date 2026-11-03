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
    ['FROM logs | STATS ??fn(?1) BY ??field', ['fn', '1', 'field']],
    ['FROM logs | WHERE msg == "?not" AND x == ?yes', ['yes']],
    ['FROM logs | WHERE msg == "a \\" ?no" AND x == ?yes', ['yes']],
    ['FROM logs | WHERE msg == """?no "" ?no""" | KEEP ?yes', ['yes']],
    ['FROM logs | KEEP `?no` | WHERE x == ?yes', ['yes']],
    ['FROM logs // ?no\n| WHERE x == ?yes /* ?no */', ['yes']],
    ['FROM logs | WHERE msg == "unterminated ?no', []],
    ['FROM logs // ?no\r| WHERE x == ?yes', ['yes']],
    ['FROM logs | WHERE msg == """a"""" | KEEP ?yes', ['yes']],
    ['FROM logs | WHERE msg == """a""""" | KEEP ?yes', ['yes']],
    ['FROM logs /* outer /* inner */ ?no */ | KEEP ?yes', ['yes']],
    ['FROM logs /* ?no /* ?no */ ?no */ | KEEP ?yes /* ?no', ['yes']],
  ])('finds the parameters in %j', (esql, names) => {
    expect(queryParams(esql)).toEqual(names);
  });

  it.each(['FROM logs | WHERE x == ?', 'FROM logs | WHERE x == ? AND y == ?y'])(
    'refuses an anonymous parameter in %j',
    (esql) => {
      expect(queryParams(esql)).toBeUndefined();
    }
  );
});
