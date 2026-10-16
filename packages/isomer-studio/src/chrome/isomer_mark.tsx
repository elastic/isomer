/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

/** The four balls of the Isomer logo, in the logo's own colors. */
export const ISOMER_MARK = {
  yellow: '#FEC514',
  teal: '#00BFB3',
  pink: '#F04E98',
  blue: '#1BA9F5',
} as const;

/** The Isomer mark at `size` pixels, decorative. */
export const IsomerMark = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden={true}>
    <circle cx="16" cy="9" r="8" fill={ISOMER_MARK.yellow} />
    <circle cx="6" cy="19" r="5" fill={ISOMER_MARK.teal} />
    <circle cx="26" cy="19" r="5" fill={ISOMER_MARK.pink} />
    <circle cx="16" cy="25" r="6" fill={ISOMER_MARK.blue} />
  </svg>
);
