/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NAVIGATION_HREF_MESSAGE,
  requiredString,
  sanitizeNavigationHref,
  z,
} from '@elastic/isomer-sdk';

import { statedRefine } from './cross_field';

/** Input-size guard against far too much text, checked before marks are parsed or text is measured; not a layout limit. */
export const authoredTextMaxLength = 10_000;

/** A field drawn on one line. */
export const lineText = () => z.string().min(1).max(authoredTextMaxLength);

/** A field that wraps. */
export const wrappedText = () => z.string().min(1).max(authoredTextMaxLength);

/** What {@link figureText} takes, for each field's description to state. */
export const figureRule =
  'It shows at least one letter, digit, punctuation mark, or symbol';

const invisible = /[\p{Default_Ignorable_Code_Point}\p{M}]/gu;
const visible = /[\p{L}\p{N}\p{P}\p{S}]/u;

/** A figure as it should read; one with nothing visible is not a figure, so leave it out for a placeholder. */
export const figureText = () =>
  lineText().check(
    statedRefine((value) => visible.test(value.replace(invisible, '')), {
      error: 'needs a visible character',
      rule: figureRule,
    })
  );

/** What {@link boundedHref} takes, for each field's description to state. */
export const hrefRule =
  'an `https`, `http`, or `mailto` URL, or a relative path';

/** An `href`, bounded as {@link lineText} is. */
export const boundedHref = () =>
  requiredString()
    .max(authoredTextMaxLength)
    .check(
      statedRefine((value) => sanitizeNavigationHref(value) !== null, {
        error: NAVIGATION_HREF_MESSAGE,
        rule: hrefRule,
      })
    );
