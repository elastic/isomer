/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Whether the config draws PNGs and PDFs; an invalid `images` turns them off. */
export const imagesEnabled = ({ images }: { images?: unknown }): boolean =>
  images === undefined || images === true;

export const imagesProblem = ({
  images,
}: {
  images?: unknown;
}): string | undefined =>
  images === undefined || typeof images === 'boolean'
    ? undefined
    : 'images must be a boolean; PNGs and PDFs are off.';
