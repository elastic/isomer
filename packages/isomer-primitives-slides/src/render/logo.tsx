/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';

import { ISOMER_LOGO_PATHS } from './logo_marks';

/** The Isomer mark. Its fills are brand-fixed literals, so it reads the same on every tone and in images. */
export const LogoMark = ({ className }: { className?: string }): ReactNode => (
  <svg
    aria-hidden
    className={className}
    fill="none"
    viewBox="0 0 32 32"
    xmlns="http://www.w3.org/2000/svg">
    {ISOMER_LOGO_PATHS.map(({ d, fill }, index) => (
      <path key={index} {...{ d, fill }} />
    ))}
  </svg>
);
