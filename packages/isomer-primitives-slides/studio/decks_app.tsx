/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CSSProperties, MouseEvent, ReactNode, RefObject } from 'react';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import type { Composition } from '@elastic/isomer-sdk';
import type { StudioAppProps, StudioTheme } from '@elastic/isomer-studio';

import type { DeckEntry, SavedDeck } from '../decks/catalog';
import { deckCatalog } from '../decks/catalog';
import {
  showSlideBuild,
  SLIDE_BUILDS,
  SLIDE_HEIGHT,
  SLIDE_WIDTH,
  slideBuilds,
} from '../src/index';

import type { DeckPlace } from './deck_route';
import {
  clampPlace,
  firstPlace,
  formatDeckPath,
  lastPlace,
  parseDeckPath,
  stepBack,
  stepForward,
} from './deck_route';
import styles from './decks_app.module.css';

type Preview = StudioAppProps['Preview'];

const BUILDS = [SLIDE_BUILDS];

const stageStyle = {
  '--slide-aspect': `${SLIDE_WIDTH / SLIDE_HEIGHT}`,
} as CSSProperties;

type Loaded = { deck: SavedDeck } | { error: Error } | undefined;

const loading = new Map<string, Promise<SavedDeck>>();

const loadDeck = ({ id, load }: DeckEntry): Promise<SavedDeck> => {
  const cached = loading.get(id);
  if (cached) {
    return cached;
  }
  const started = load();
  loading.set(id, started);
  started.catch(() => loading.delete(id));
  return started;
};

const useDeck = (entry: DeckEntry | undefined): Loaded => {
  const [loaded, setLoaded] = useState<{ id: string; value: Loaded }>();
  useEffect(() => {
    if (!entry) {
      return;
    }
    let isCurrent = true;
    loadDeck(entry).then(
      (deck) => isCurrent && setLoaded({ id: entry.id, value: { deck } }),
      (error: unknown) =>
        isCurrent &&
        setLoaded({
          id: entry.id,
          value: {
            error: error instanceof Error ? error : new Error(String(error)),
          },
        })
    );
    return () => {
      isCurrent = false;
    };
  }, [entry]);
  return loaded && loaded.id === entry?.id ? loaded.value : undefined;
};

/** Saved slides carry no theme, so each takes the Studio's. */
const useThemedSlides = (deck: SavedDeck, theme: StudioTheme) =>
  useMemo(
    () => deck.slides.map((slide): Composition => ({ ...slide, theme })),
    [deck, theme]
  );

/** Reads a deck's own slide links, `?slide=<index from 0>`. */
const linkedSlide = (event: MouseEvent): number | undefined => {
  const anchor = event.nativeEvent
    .composedPath()
    .find(
      (target): target is HTMLAnchorElement =>
        target instanceof HTMLAnchorElement
    );
  const match = /^\?slide=(\d+)$/.exec(anchor?.getAttribute('href') ?? '');
  return match ? Number(match[1]) : undefined;
};

/** The zoom that fills the screen while `presenter` is full screen; `fit` never scales up. */
const usePresentingZoom = (presenter: RefObject<HTMLElement | null>) => {
  const [zoom, setZoom] = useState<number>();
  useEffect(() => {
    const update = () =>
      setZoom(
        document.fullscreenElement === presenter.current
          ? Math.min(
              window.innerWidth / SLIDE_WIDTH,
              window.innerHeight / SLIDE_HEIGHT
            )
          : undefined
      );
    document.addEventListener('fullscreenchange', update);
    window.addEventListener('resize', update);
    return () => {
      document.removeEventListener('fullscreenchange', update);
      window.removeEventListener('resize', update);
    };
  }, [presenter]);
  return zoom;
};

const isEditable = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable ||
    ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));

const Tile = ({
  label,
  caption,
  onOpen,
  children,
}: {
  label: string;
  caption: ReactNode;
  onOpen: () => void;
  children: ReactNode;
}) => (
  <li className={styles.tile}>
    {/* React 18 drops an `inert` prop. */}
    <div
      className={styles.thumb}
      ref={(element) => element?.setAttribute('inert', '')}>
      {children}
    </div>
    <button
      type="button"
      className={styles.tileButton}
      aria-label={label}
      onClick={onOpen}>
      {caption}
    </button>
  </li>
);

const Pending = ({ loaded }: { loaded: Loaded }) =>
  loaded && 'error' in loaded ? (
    <EuiCallOut
      announceOnMount
      size="s"
      color="danger"
      iconType="error"
      title="This deck could not load">
      <p>{loaded.error.message}</p>
    </EuiCallOut>
  ) : (
    <EuiLoadingSpinner size="l" />
  );

const DeckCard = ({
  entry,
  Preview,
  theme,
  onOpen,
}: {
  entry: DeckEntry;
  Preview: Preview;
  theme: StudioTheme;
  onOpen: () => void;
}) => {
  const loaded = useDeck(entry);
  const { title } = entry;
  return (
    <Tile
      label={title}
      caption={
        <>
          <EuiTitle size="xxs">
            <h3>{title}</h3>
          </EuiTitle>
          {loaded && 'deck' in loaded ? (
            <EuiText size="xs" color="subdued">
              {loaded.deck.slides.length} slides
            </EuiText>
          ) : null}
        </>
      }
      {...{ onOpen }}>
      {loaded && 'deck' in loaded ? (
        <TitleSlide deck={loaded.deck} {...{ Preview, theme }} />
      ) : (
        <Pending {...{ loaded }} />
      )}
    </Tile>
  );
};

const TitleSlide = ({
  deck,
  Preview,
  theme,
}: {
  deck: SavedDeck;
  Preview: Preview;
  theme: StudioTheme;
}) => {
  const [first] = useThemedSlides(deck, theme);
  return first ? <Preview composition={first} heading={false} /> : null;
};

const DeckList = ({
  Preview,
  theme,
  navigate,
}: Pick<StudioAppProps, 'Preview' | 'theme' | 'navigate'>) => (
  <div className={styles.page}>
    <EuiTitle size="s">
      <h2>Decks</h2>
    </EuiTitle>
    <ul className={styles.grid}>
      {deckCatalog.map((entry) => (
        <DeckCard
          key={entry.id}
          {...{ entry, Preview, theme }}
          onOpen={() => navigate(formatDeckPath({ deck: entry.id }))}
        />
      ))}
    </ul>
  </div>
);

const DeckSlides = ({
  entry: { id, title },
  deck,
  Preview,
  theme,
  navigate,
}: {
  entry: DeckEntry;
  deck: SavedDeck;
} & Pick<StudioAppProps, 'Preview' | 'theme' | 'navigate'>) => {
  const slides = useThemedSlides(deck, theme);
  const open = (slide: number) =>
    navigate(formatDeckPath({ deck: id, place: { slide, step: 0 } }));
  return (
    <div className={styles.page}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="sortLeft"
            size="s"
            onClick={() => navigate('')}>
            All decks
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="s">
            <h2>{title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton size="s" iconType="play" onClick={() => open(0)}>
            Start
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <ol className={styles.grid}>
        {slides.map((slide, index) => {
          const name = slide.title ?? `Slide ${index + 1}`;
          return (
            <Tile
              key={index}
              label={`Slide ${index + 1}: ${name}`}
              caption={
                <EuiText size="xs">
                  {index + 1}. {name}
                </EuiText>
              }
              onOpen={() => open(index)}>
              <Preview composition={slide} heading={false} />
            </Tile>
          );
        })}
      </ol>
    </div>
  );
};

const SlideStage = ({
  entry: { id, title },
  deck,
  place: requested,
  Preview,
  theme,
  navigate,
}: {
  entry: DeckEntry;
  deck: SavedDeck;
  place: DeckPlace;
} & Pick<StudioAppProps, 'Preview' | 'theme' | 'navigate'>) => {
  const slides = useThemedSlides(deck, theme);
  const builds = useMemo(
    () => deck.slides.map((slide) => slideBuilds(slide)),
    [deck]
  );
  const place = clampPlace(requested, builds);
  const { slide, step } = place;
  const composition = slides[slide];
  const previous = stepBack(place, builds);
  const next = stepForward(place, builds);

  const go = useCallback(
    (to: DeckPlace) => navigate(formatDeckPath({ deck: id, place: to })),
    [id, navigate]
  );

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { key, altKey, ctrlKey, metaKey, defaultPrevented, target } = event;
      if (
        defaultPrevented ||
        altKey ||
        ctrlKey ||
        metaKey ||
        isEditable(target)
      ) {
        return;
      }
      const to =
        key === 'ArrowRight'
          ? next
          : key === 'ArrowLeft'
            ? previous
            : key === 'Home'
              ? firstPlace
              : key === 'End'
                ? lastPlace(builds)
                : undefined;
      if (to) {
        event.preventDefault();
        go(to);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [builds, go, next, previous]);

  const presenter = useRef<HTMLDivElement>(null);
  const zoom = usePresentingZoom(presenter);

  const onClickCapture = (event: MouseEvent) => {
    const linked = linkedSlide(event);
    if (linked !== undefined) {
      event.preventDefault();
      go({ slide: linked, step: 0 });
    }
  };

  const onCommit = useCallback(
    (root: ShadowRoot) => {
      if (composition) {
        showSlideBuild(root, composition, step);
      }
    },
    [composition, step]
  );

  if (!composition) {
    return null;
  }
  const stepCount = builds[slide] ?? 0;

  return (
    <div className={styles.page}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonEmpty
            iconType="sortLeft"
            size="s"
            onClick={() => navigate(formatDeckPath({ deck: id }))}>
            {title}
          </EuiButtonEmpty>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="chevronSingleLeft"
            aria-label="Previous"
            isDisabled={!previous}
            onClick={() => previous && go(previous)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="chevronSingleRight"
            aria-label="Next"
            isDisabled={!next}
            onClick={() => next && go(next)}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>{composition.title ?? `Slide ${slide + 1}`}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {stepCount > 0 ? (
          <EuiFlexItem grow={false}>
            <EuiText size="s" color="subdued">
              Build {step} of {stepCount}
            </EuiText>
          </EuiFlexItem>
        ) : null}
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued" data-test-subj="deckCounter">
            {slide + 1} of {slides.length}
          </EuiText>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="fullScreen"
            onClick={() => void presenter.current?.requestFullscreen()}>
            Present
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div
        ref={presenter}
        className={styles.presenter}
        style={stageStyle}
        {...{ onClickCapture }}>
        <div className={styles.screen}>
          <Preview
            {...{ composition, onCommit }}
            heading={false}
            enhancements={BUILDS}
            zoom={zoom ?? 'fit'}
          />
        </div>
      </div>
    </div>
  );
};

/** The committed decks in `decks/`, at `#/app/decks/<deck>/<n>/<step>`. */
const DecksApp = ({ Preview, theme, path, navigate }: StudioAppProps) => {
  const { deck: id, place } = parseDeckPath(path);
  const entry = deckCatalog.find((candidate) => candidate.id === id);
  const loaded = useDeck(entry);

  if (!entry) {
    return <DeckList {...{ Preview, theme, navigate }} />;
  }
  if (!loaded || 'error' in loaded) {
    return (
      <div className={styles.page}>
        <Pending {...{ loaded }} />
      </div>
    );
  }
  const { deck } = loaded;
  return place ? (
    <SlideStage {...{ entry, deck, place, Preview, theme, navigate }} />
  ) : (
    <DeckSlides {...{ entry, deck, Preview, theme, navigate }} />
  );
};

export default DecksApp;
