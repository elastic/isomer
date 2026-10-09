/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { HtmlSurface } from './html_surface';

/** The `snapshot` surface's frame, laid out against its own stylesheet in a sandboxed frame. */
export const SnapshotSurface = ({
  html,
  stylesheet,
}: {
  html: string;
  stylesheet: string;
}) => (
  <HtmlSurface
    html={`<style>${stylesheet}</style>${html}`}
    title="Snapshot preview"
  />
);
