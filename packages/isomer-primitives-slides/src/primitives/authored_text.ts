/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Bounded before marks are parsed or text is measured, at more than any slide can draw.

import { navigationHref, z } from '@elastic/isomer-sdk';

import {
  frameBodyCharacters,
  frameLineCharacters,
} from '../theme/components/frame';

/** A field drawn on one line. */
export const lineText = () => z.string().min(1).max(frameLineCharacters);

/** A field that wraps. */
export const wrappedText = () => z.string().min(1).max(frameBodyCharacters);

/** An `href`, bounded as {@link lineText} is. */
export const boundedHref = () => navigationHref().max(frameLineCharacters);
