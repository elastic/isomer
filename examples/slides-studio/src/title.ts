/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect } from 'react';

const studio = 'Isomer studio';

/** Sets the tab title for the page showing; `name` leads it when given. */
export const usePageTitle = (name?: string) => {
  useEffect(() => {
    document.title = name ? `${name} · ${studio}` : studio;
  }, [name]);
};
