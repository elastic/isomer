/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Index headings, in the order an author usually chooses. Membership is each primitive's `group`. */
export const SLIDE_GROUP_ORDER = [
  'Slide structure',
  'Layout',
  'Text',
  'Diagrams',
  'Data',
  'Code',
  'Renders',
] as const;

/** A heading in {@link SLIDE_GROUP_ORDER}. `SlidePackTypes.groups` is this union. */
export type SlideGroup = (typeof SLIDE_GROUP_ORDER)[number];
