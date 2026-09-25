/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DeckPage } from './deck_page';
import { Home } from './home';
import { Present } from './present';
import { usePage } from './router';

/** The studio's three pages: instructions and decks, one deck's slides, and the viewer. */
export const App = () => {
  const page = usePage();
  switch (page.name) {
    case 'home':
      return <Home />;
    case 'deck':
      return <DeckPage id={page.id} key={page.id} />;
    case 'present':
      return <Present id={page.id} key={page.id} />;
  }
};
