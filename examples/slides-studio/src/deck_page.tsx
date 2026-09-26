/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Theme } from '@elastic/isomer-deck/viewer';
import type { Composition } from '@elastic/isomer-sdk';

import { runtime } from '../common/runtime';

import { TopBar } from './chrome';
import { useDeck } from './decks';
import { Link, presentHref } from './router';
import { number, slugOf, updatedAgo } from './slides';
import { usePageTheme } from './theme';
import { Thumbnail } from './thumbnail';
import { usePageTitle } from './title';

const freshFor = 6000;

/** Slides whose JSON was not in the previous snapshot: new or rewritten, but not merely moved. `undefined` means no snapshot yet. */
const useFresh = (
  jsons: readonly string[] | undefined
): ReadonlySet<string> => {
  const previous = useRef<ReadonlySet<string>>(undefined);
  const [fresh, setFresh] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    if (!jsons) {
      return undefined;
    }
    const before = previous.current;
    previous.current = new Set(jsons);
    const added = before ? jsons.filter((json) => !before.has(json)) : [];
    if (added.length === 0) {
      return undefined;
    }
    setFresh(new Set(added));
    const timer = window.setTimeout(() => setFresh(new Set()), freshFor);
    return () => window.clearTimeout(timer);
  }, [jsons]);
  return fresh;
};

const SlideCard = ({
  deckId,
  index,
  json,
  fresh,
  theme,
}: {
  deckId: string;
  index: number;
  json: string;
  fresh: boolean;
  theme: Theme;
}) => {
  const composition = useMemo(() => JSON.parse(json) as Composition, [json]);
  const valid = useMemo(
    () => runtime.validate(composition).valid,
    [composition]
  );
  const [overflowing, setOverflowing] = useState(false);
  const search = new URLSearchParams({
    slide: slugOf(index, composition),
    theme,
  });
  return (
    <li className={fresh ? 'card fresh' : 'card'} data-fresh={fresh}>
      <Link href={presentHref(deckId, `?${search.toString()}`)}>
        <Thumbnail {...{ json, theme }} onOverflow={setOverflowing} />
        <span className="card-caption">
          <span className="card-number">{number(index)}</span>
          <span className="card-title">{composition.title ?? 'Untitled'}</span>
          {valid ? null : (
            <span className="badge" title="Open it to see the errors">
              Needs fixing
            </span>
          )}
          {overflowing ? (
            <span
              className="badge"
              title="Content runs past the slide’s area. Shorten it; a node that takes size can also be set to s.">
              Overflows
            </span>
          ) : null}
          {fresh ? <span className="badge badge-new">New</span> : null}
        </span>
      </Link>
    </li>
  );
};

/** Every slide in one deck, updating live as the agent writes. */
export const DeckPage = ({ id }: { id: string }) => {
  const { deck, missing, live } = useDeck(id);
  const [theme, toggleTheme] = usePageTheme();
  const [follow, setFollow] = useState(true);
  const grid = useRef<HTMLOListElement>(null);

  const jsons = useMemo(
    () => deck?.slides.map((slide) => JSON.stringify(slide)),
    [deck]
  );
  const fresh = useFresh(jsons);

  useEffect(() => {
    if (follow && fresh.size > 0) {
      grid.current
        ?.querySelector('[data-fresh="true"]')
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [follow, fresh]);

  usePageTitle(deck?.title);

  return (
    <div className="page">
      <TopBar>
        <span className="spacer" />
        <span className={live ? 'live on' : 'live'}>
          {live ? 'Live' : 'Reconnecting'}
        </span>
        <label className="follow">
          <input
            checked={follow}
            onChange={({ target: { checked } }) => setFollow(checked)}
            type="checkbox"
          />
          Follow new slides
        </label>
        <button
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
          type="button">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
        {deck && deck.slides.length > 0 ? (
          <Link
            className="button primary"
            href={presentHref(id, `?theme=${theme}`)}>
            Present
          </Link>
        ) : null}
      </TopBar>
      <main className="deck-page">
        {missing ? (
          <section className="intro">
            <h1>No deck "{id}"</h1>
            <p>
              <Link href="/">See every deck</Link>
            </p>
          </section>
        ) : deck ? (
          <>
            <section className="intro">
              <h1>{deck.title}</h1>
              <p className="muted">
                {deck.slides.length === 1
                  ? '1 slide'
                  : `${deck.slides.length} slides`}{' '}
                · updated {updatedAgo(deck.updatedAt)}
              </p>
            </section>
            {deck.slides.length === 0 ? (
              <p className="muted">No slides yet.</p>
            ) : null}
            <ol className="grid" ref={grid}>
              {jsons?.map((json, index) => (
                <SlideCard
                  deckId={id}
                  fresh={fresh.has(json)}
                  key={index}
                  {...{ index, json, theme }}
                />
              ))}
            </ol>
          </>
        ) : null}
      </main>
    </div>
  );
};
