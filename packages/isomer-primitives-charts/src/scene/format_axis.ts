/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatValue } from '../format/format';

import type { SceneAxis, XyScene } from './types';

/** A value on a continuous axis as the axis prints it, such as a tick an engine chose. */
export const formatAxisValue = (
  { locale, timeZone }: Pick<XyScene, 'locale' | 'timeZone'>,
  { format }: Pick<SceneAxis, 'format'>,
  value: number
): string => formatValue(value, format, { locale, timeZone });
