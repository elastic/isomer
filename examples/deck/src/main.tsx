/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import '@fontsource/inter/400.css';
import '@fontsource/inter/400-italic.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/roboto-mono/400.css';
import '@fontsource/roboto-mono/500.css';
import '@fontsource/roboto-mono/600.css';
import '@fontsource/roboto-mono/700.css';
import './viewer/viewer.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { deck } from './deck';
import { Viewer } from './viewer/app';
import { pngPath } from './viewer/surfaces';

const root = document.getElementById('root');
if (root) {
  createRoot(root).render(
    <StrictMode>
      <Viewer
        homeHref="https://elastic.github.io/isomer/"
        logoSrc={`${import.meta.env.BASE_URL}logo.svg`}
        pngUrl={({ slug }, theme) =>
          `${import.meta.env.BASE_URL}${pngPath(slug, theme)}`
        }
        slides={deck}
      />
    </StrictMode>
  );
}
