/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useEffect, useRef } from 'react';
import type { Theme } from '@elastic/isomer-deck/viewer';

import { Copyable, TopBar } from './chrome';
import { type DeckListing, deleteDeck, useDeckList } from './decks';
import { deckHref, Link, navigate } from './router';
import { updatedAgo } from './slides';
import { usePageTheme } from './theme';
import { Thumbnail } from './thumbnail';
import { usePageTitle } from './title';

const mcpUrl = `${window.location.origin}/mcp`;
const connect = `claude mcp add --transport http isomer-slides ${mcpUrl}`;
const prompt =
  'Use isomer-slides to write an eight-slide deck on progressive enhancement for a team of web developers.';

const slideCountLabel = (count: number) =>
  count === 1 ? '1 slide' : `${count} slides`;

const confirmDelete = (id: string, title: string, slideCount: number) => {
  if (
    !window.confirm(
      `Delete "${title}" and its ${slideCountLabel(slideCount)}? This cannot be undone.`
    )
  ) {
    return;
  }
  deleteDeck(id).catch((error: unknown) =>
    window.alert(error instanceof Error ? error.message : String(error))
  );
};

const DeckRow = ({
  deck: { id, title, slideCount, updatedAt, cover },
  theme,
}: {
  deck: DeckListing;
  theme: Theme;
}) => (
  <li className="deck-item">
    <Link className="deck-row" href={deckHref(id)}>
      {cover ? (
        <Thumbnail json={JSON.stringify(cover)} {...{ theme }} />
      ) : (
        <span aria-hidden className="thumb thumb-empty">
          {slideCount === 0 ? 'No slides yet' : null}
        </span>
      )}
      <span className="deck-row-text">
        <span className="deck-row-title">{title}</span>
        <span className="deck-row-meta">
          {slideCountLabel(slideCount)} · updated {updatedAgo(updatedAt)}
        </span>
      </span>
    </Link>
    <button
      aria-label={`Delete ${title}`}
      className="delete"
      onClick={() => confirmDelete(id, title, slideCount)}
      type="button">
      Delete
    </button>
  </li>
);

/** Instructions for connecting an agent, and every deck the studio holds. */
/** Opens a deck created while this page is showing, so the agent's first slides are watched as they land. */
const useOpenNewDecks = (decks: readonly DeckListing[] | undefined) => {
  const seen = useRef<ReadonlySet<string>>(undefined);
  useEffect(() => {
    if (!decks) {
      return;
    }
    const before = seen.current;
    seen.current = new Set(decks.map(({ id }) => id));
    // Newest first, so the first unseen deck is the one just created.
    const created = before
      ? decks.find(({ id }) => !before.has(id))
      : undefined;
    if (created) {
      navigate(deckHref(created.id));
    }
  }, [decks]);
};

export const Home = () => {
  const decks = useDeckList();
  useOpenNewDecks(decks);
  const [theme, toggleTheme] = usePageTheme();
  usePageTitle();

  return (
    <div className="page">
      <TopBar>
        <span className="spacer" />
        <button
          aria-pressed={theme === 'dark'}
          onClick={toggleTheme}
          type="button">
          {theme === 'dark' ? 'Dark' : 'Light'}
        </button>
      </TopBar>
      <main className="home">
        <section className="intro">
          <h1>Watch an agent write a slide deck</h1>
          <p>
            The studio serves the Isomer slides runtime over MCP. Your agent
            reads the primitive catalog, writes each slide as a composition the
            runtime validates, and looks at it as a PNG before moving on. Each
            slide appears here the moment it is stored.
          </p>
          <p className="muted">
            <a href="https://elastic.github.io/isomer/">What Isomer is</a> ·{' '}
            <a href="https://elastic.github.io/isomer/deck/">
              The Isomer deck, itself written with this pack
            </a>
          </p>
        </section>

        <ol className="steps">
          <li>
            <h2>Connect your agent</h2>
            <p>In Claude Code:</p>
            <Copyable label="the command" text={connect} />
            <p>
              Any other MCP client: add a Streamable HTTP server at{' '}
              <code>{mcpUrl}</code>.
            </p>
          </li>
          <li>
            <h2>Ask for a deck</h2>
            <p>Name the subject, the audience, and roughly how many slides.</p>
            <Copyable label="the prompt" text={prompt} wrap />
          </li>
          <li>
            <h2>Watch it arrive</h2>
            <p>
              Open the deck below. Slides appear as the agent writes them; open
              one to see it on every surface, from PNG to Slack.
            </p>
          </li>
        </ol>

        <section aria-labelledby="decks-heading" className="decks">
          <h2 id="decks-heading">Decks</h2>
          {decks === undefined ? null : decks.length === 0 ? (
            <p className="muted">
              No decks yet. The first one your agent creates appears here.
            </p>
          ) : (
            <ul className="deck-list">
              {decks.map((deck) => (
                <DeckRow key={deck.id} {...{ deck, theme }} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
};
