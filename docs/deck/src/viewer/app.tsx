/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { slideStylesheet } from '@elastic/isomer-primitives-slides';

import { deck } from '../deck';
import { surfaces, type Theme } from '../surfaces';

import { readRoute, type Route, writeRoute } from './route';
import { Stage } from './stage';

const stylesheet = slideStylesheet();

const preferredTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const number = (index: number) => String(index).padStart(2, '0');

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));

/** The deck viewer: plain React around slides that are all Isomer. */
export const App = () => {
  const [route, setRoute] = useState<Route>(() =>
    readRoute(window.location.search, preferredTheme())
  );
  const [fullscreen, setFullscreen] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const rail = useRef<HTMLOListElement>(null);
  const shownIndex = useRef(route.index);
  const fromHistory = useRef(false);

  const { index, surface, theme } = route;
  const slide = deck[index] ?? deck[0];
  const current = surfaces.find(({ id }) => id === surface) ?? surfaces[0];

  const go = useCallback(
    (next: Partial<Route>) => setRoute((prev) => ({ ...prev, ...next })),
    []
  );
  const step = useCallback(
    (by: number) =>
      setRoute((prev) => ({
        ...prev,
        index: Math.min(Math.max(prev.index + by, 0), deck.length - 1),
      })),
    []
  );
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void stage.current?.requestFullscreen();
    }
  }, []);

  // A slide change is a history entry; a surface or theme change is not.
  useEffect(() => {
    const url = writeRoute(route);
    if (fromHistory.current) {
      fromHistory.current = false;
    } else if (url !== window.location.search) {
      const method =
        route.index === shownIndex.current ? 'replaceState' : 'pushState';
      window.history[method](null, '', url);
    }
    shownIndex.current = route.index;
  }, [route]);

  useEffect(() => {
    const onPop = () => {
      fromHistory.current = true;
      setRoute((prev) => readRoute(window.location.search, prev.theme));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  useEffect(() => {
    const onChange = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    rail.current
      ?.querySelector('[aria-current="true"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [index]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        isTyping(event.target)
      ) {
        return;
      }
      const surfaceKey = Number(event.key);
      if (Number.isInteger(surfaceKey) && surfaces[surfaceKey - 1]) {
        go({ surface: surfaces[surfaceKey - 1]!.id });
        return;
      }
      switch (event.key) {
        case 'ArrowRight':
        case 'ArrowDown':
        case 'PageDown':
        case ' ':
          step(1);
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          step(-1);
          break;
        case 'Home':
          go({ index: 0 });
          break;
        case 'End':
          go({ index: deck.length - 1 });
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 't':
          setRoute((prev) => ({
            ...prev,
            theme: prev.theme === 'dark' ? 'light' : 'dark',
          }));
          break;
        default:
          return;
      }
      event.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, step, toggleFullscreen]);

  if (!slide) {
    return null;
  }

  return (
    <div className="deck">
      <style>{stylesheet}</style>
      <header className="toolbar">
        <a className="brand" href="https://elastic.github.io/isomer/">
          <img
            alt=""
            height={20}
            src={`${import.meta.env.BASE_URL}logo.svg`}
            width={20}
          />
          Isomer
        </a>
        <div className="pager">
          <button
            aria-label="Previous slide"
            disabled={index === 0}
            onClick={() => step(-1)}
            type="button">
            ‹
          </button>
          <span aria-live="polite">
            {number(index)} / {number(deck.length - 1)}
          </span>
          <button
            aria-label="Next slide"
            disabled={index === deck.length - 1}
            onClick={() => step(1)}
            type="button">
            ›
          </button>
        </div>
        <div aria-label="Surface" className="surfaces" role="tablist">
          {surfaces.map(({ id, label }, position) => (
            <button
              aria-selected={id === surface}
              key={id}
              onClick={() => go({ surface: id })}
              role="tab"
              title={`${label} (${position + 1})`}
              type="button">
              {label}
            </button>
          ))}
        </div>
        <div className="actions">
          <button
            aria-pressed={theme === 'dark'}
            onClick={() => go({ theme: theme === 'dark' ? 'light' : 'dark' })}
            title="Theme (t)"
            type="button">
            {theme === 'dark' ? 'Dark' : 'Light'}
          </button>
          <button
            aria-pressed={fullscreen}
            onClick={toggleFullscreen}
            title="Fullscreen (f)"
            type="button">
            Fullscreen
          </button>
        </div>
      </header>
      <div className="layout">
        <nav aria-label="Slides" className="rail">
          <ol ref={rail}>
            {deck.map(({ composition, slug }, position) => (
              <li key={slug}>
                <button
                  aria-current={position === index}
                  onClick={() => go({ index: position })}
                  type="button">
                  <span className="rail-number">{number(position)}</span>
                  {composition.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <main className="main">
          <section
            aria-label={`${slide.composition.title}, ${current.label}`}
            className={`stage stage-${current.id}`}
            ref={stage}>
            <Stage {...{ slide, surface, theme }} />
          </section>
          <p className="call">
            <code>{current.call}</code>
          </p>
        </main>
      </div>
    </div>
  );
};
