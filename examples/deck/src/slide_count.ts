/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Outside `slides/` because `import.meta.glob` never matches the file that calls it.

/** How many slide files the deck has. */
export const slideCount = Object.keys(
  import.meta.glob('./slides/[0-9][0-9]_*.tsx')
).length;
