/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { memo, useMemo } from 'react';
import type { Theme } from '@elastic/isomer-deck/surfaces';
import { Scaled, ShadowSlide } from '@elastic/isomer-deck/viewer';
import type { Composition } from '@elastic/isomer-sdk';

/** One slide at thumbnail scale, in its own shadow root. Keyed on the composition's JSON, so an unchanged slide never re-renders. */
export const Thumbnail = memo(
  ({
    json,
    theme,
    onOverflow,
  }: {
    json: string;
    theme: Theme;
    onOverflow?: ((overflowing: boolean) => void) | undefined;
  }) => {
    const composition = useMemo(() => JSON.parse(json) as Composition, [json]);
    return (
      <div className="thumb">
        <Scaled fullscreen={false}>
          <ShadowSlide {...{ composition, theme, onOverflow }} />
        </Scaled>
      </div>
    );
  }
);
Thumbnail.displayName = 'Thumbnail';
