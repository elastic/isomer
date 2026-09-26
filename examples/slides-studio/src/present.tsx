/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { Viewer } from '@elastic/isomer-deck/viewer';

import { useDeck } from './decks';
import { deckHref, Link } from './router';
import { toSlides } from './slides';
import { usePageTitle } from './title';

/** The deck viewer over one live deck. */
export const Present = ({ id }: { id: string }) => {
  const { deck, missing } = useDeck(id);
  const slides = useMemo(() => (deck ? toSlides(deck) : []), [deck]);
  usePageTitle(deck?.title);

  if (missing) {
    return (
      <main className="deck-page">
        <section className="intro">
          <h1>No deck "{id}"</h1>
          <p>
            <Link href="/">See every deck</Link>
          </p>
        </section>
      </main>
    );
  }
  // The viewer reads `?slide=` once, so it mounts only when that slide can be found.
  if (!deck) {
    return null;
  }
  return (
    <Viewer
      empty={
        <section className="intro">
          <h1>{deck.title} has no slides yet</h1>
          <p>
            <Link href={deckHref(id)}>Watch for them</Link>
          </p>
        </section>
      }
      homeHref="/"
      logoSrc="/logo.svg"
      pngUrl={(slide, theme) =>
        `/png/${id}/${slides.indexOf(slide)}.${theme}.png?v=${deck.updatedAt}`
      }
      slides={slides}
      pagerEnd={
        <Link className="button" href={deckHref(id)}>
          All slides
        </Link>
      }
    />
  );
};
