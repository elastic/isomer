/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { slideBuilds } from '@elastic/isomer-primitives-slides';
import { formatValidationError } from '@elastic/isomer-sdk';

import { runtime } from '../runtime';
import { surfaces, type Theme } from '../surfaces';

import { readRoute, type Route, writeRoute } from './route';
import { SourcePanel } from './source_panel';
import { Stage } from './stage';
import type { DeckSlide, PngUrl } from './types';

const preferredTheme = (): Theme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';

const number = (index: number) => String(index).padStart(2, '0');

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));

export interface ViewerProps {
  /** The deck, in order. May change while mounted (a live deck). */
  slides: readonly DeckSlide[];
  /** Where each slide's PNG is served. */
  pngUrl: PngUrl;
  /** Logo shown in the toolbar. */
  logoSrc: string;
  /** Where the toolbar brand links. */
  homeHref: string;
  /** Shown instead of a stage while `slides` is empty. */
  empty?: ReactNode;
  /** Navigation beside the pager, e.g. a link to every slide. */
  pagerEnd?: ReactNode;
}

/** The deck viewer: plain React around slides that are all Isomer. */
export const Viewer = ({
  slides,
  pngUrl,
  logoSrc,
  homeHref,
  empty = null,
  pagerEnd = null,
}: ViewerProps) => {
  const [route, setRoute] = useState<Route>(() =>
    readRoute(slides, window.location.search, preferredTheme())
  );
  const [fullscreen, setFullscreen] = useState(false);
  const stage = useRef<HTMLElement>(null);
  const rail = useRef<HTMLOListElement>(null);
  const shownIndex = useRef(route.index);
  const fromHistory = useRef(false);

  const { builds, surface, theme, source } = route;
  const last = Math.max(slides.length - 1, 0);
  const index = Math.min(route.index, last);
  const slide = slides[index];
  const current = surfaces.find(({ id }) => id === surface) ?? surfaces[0];
  const [overflowing, setOverflowing] = useState<DeckSlide>();
  const errors = useMemo(
    () =>
      slide
        ? runtime.validate(slide.composition).errors.map(formatValidationError)
        : [],
    [slide]
  );

  // Only the surfaces the viewer draws itself can hide a slide's parts.
  const buildable = builds && (surface === 'slide' || surface === 'html');
  const countAt = useCallback(
    (position: number) => {
      const at = slides[position];
      return buildable && at
        ? slideBuilds(at.composition, runtime.primitives)
        : 0;
    },
    [slides, buildable]
  );
  const count = useMemo(() => countAt(index), [countAt, index]);
  const shown = Math.min(route.build ?? count, count);

  const go = useCallback(
    (next: Partial<Route>) => setRoute((prev) => ({ ...prev, ...next })),
    []
  );
  const step = useCallback(
    (by: number) =>
      setRoute((prev) => ({
        ...prev,
        index: Math.min(Math.max(prev.index + by, 0), last),
        build: undefined,
      })),
    [last]
  );
  const startAt = useCallback(
    (position: number) =>
      go({ index: position, build: countAt(position) > 0 ? 0 : undefined }),
    [go, countAt]
  );
  // A click reveals the slide's next part, and moves on once it has none left.
  const advance = useCallback(() => {
    if (shown < count) {
      go({ build: shown + 1 < count ? shown + 1 : undefined });
    } else if (index < last) {
      startAt(index + 1);
    }
  }, [go, startAt, shown, count, index, last]);
  const retreat = useCallback(() => {
    if (shown > 0) {
      go({ build: shown - 1 });
    } else if (index > 0) {
      go({ index: index - 1, build: undefined });
    }
  }, [go, shown, index]);
  const firstSource = slide?.sources[0]?.id;
  const toggleSource = useCallback(
    () =>
      setRoute((prev) => ({
        ...prev,
        source: prev.source ? undefined : firstSource,
      })),
    [firstSource]
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
    const url = writeRoute(
      slides,
      { ...route, index, build: shown < count ? shown : undefined },
      window.location.search
    );
    if (fromHistory.current) {
      fromHistory.current = false;
    } else if (url !== window.location.search) {
      const method =
        route.index === shownIndex.current ? 'replaceState' : 'pushState';
      window.history[method](null, '', url);
    }
    shownIndex.current = route.index;
  }, [slides, route, index, shown, count]);

  useEffect(() => {
    const onPop = () => {
      fromHistory.current = true;
      setRoute((prev) => readRoute(slides, window.location.search, prev.theme));
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, [slides]);

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
          advance();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
        case 'PageUp':
          retreat();
          break;
        case 'Home':
          startAt(0);
          break;
        case 'End':
          go({ index: last, build: undefined });
          break;
        case 'f':
          toggleFullscreen();
          break;
        case 's':
          toggleSource();
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
  }, [go, advance, retreat, startAt, toggleFullscreen, toggleSource, last]);

  return (
    <div className="deck">
      <header className="toolbar">
        <a className="brand" href={homeHref}>
          <img alt="" height={20} src={logoSrc} width={20} />
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
            {number(index)} / {number(last)}
            {shown < count ? (
              <span className="pager-build">
                {' '}
                · {shown}/{count}
              </span>
            ) : null}
          </span>
          <button
            aria-label="Next slide"
            disabled={index === last}
            onClick={() => step(1)}
            type="button">
            ›
          </button>
          {pagerEnd ? <span className="pager-end">{pagerEnd}</span> : null}
        </div>
        <div className="views">
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
          {firstSource ? (
            <>
              <span aria-hidden className="views-divider" />
              <button
                aria-pressed={Boolean(source)}
                className="source-toggle"
                onClick={toggleSource}
                title="Source (s)"
                type="button">
                Source
              </button>
            </>
          ) : null}
        </div>
        <div className="actions">
          <button
            aria-pressed={builds}
            onClick={() => go({ builds: !builds, build: undefined })}
            title="Reveal a slide's parts one click at a time"
            type="button">
            Builds
          </button>
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
            {slides.map(({ composition, slug }, position) => (
              <li key={slug}>
                <button
                  aria-current={position === index}
                  onClick={() => go({ index: position, build: undefined })}
                  type="button">
                  <span className="rail-number">{number(position)}</span>
                  {composition.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>
        <main className="main">
          {slide ? (
            <>
              {overflowing === slide ? (
                <div className="invalid" role="status">
                  <p>This slide’s content runs past its area.</p>
                  <p className="invalid-hint">
                    Shorten it. A node that takes <code>size</code> can also be
                    set to <code>"s"</code>.
                  </p>
                </div>
              ) : null}
              {errors.length > 0 ? (
                <div className="invalid" role="alert">
                  <p>This slide no longer validates:</p>
                  <ul>
                    {errors.map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
              <section
                aria-label={`${slide.composition.title}, ${current.label}`}
                className={`stage stage-${current.id}`}
                ref={stage}>
                <Stage
                  {...{ fullscreen, pngUrl, slide, surface, theme }}
                  build={builds ? shown : undefined}
                  onOverflow={(overflows) =>
                    setOverflowing(overflows ? slide : undefined)
                  }
                />
              </section>
              <p className="call">
                <code>{current.call}</code>
              </p>
            </>
          ) : (
            empty
          )}
        </main>
        {slide && source ? (
          <SourcePanel
            active={source}
            onClose={toggleSource}
            onSelect={(id) => go({ source: id })}
            sources={slide.sources}
          />
        ) : null}
      </div>
    </div>
  );
};
