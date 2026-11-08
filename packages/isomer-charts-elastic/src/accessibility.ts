/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Scene } from '@elastic/isomer-primitives-charts/scene';

/** The Scene's summary, then its authored description. */
export const ariaDescriptionOf = ({ summary, description }: Scene): string =>
  description ? `${summary} ${description}` : summary;
