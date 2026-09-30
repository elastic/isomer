/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@elastic/isomer-sdk';

/** Input-size guard against far too much text, checked before marks are parsed or text is measured; not a layout limit. */
export const authoredTextMaxLength = 10_000;

/** A field drawn on one line. */
export const lineText = () => z.string().min(1).max(authoredTextMaxLength);

/** A field that wraps. */
export const wrappedText = () => z.string().min(1).max(authoredTextMaxLength);
