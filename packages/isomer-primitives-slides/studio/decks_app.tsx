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
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiLoadingSpinner,
  EuiText,
  EuiTitle,
  EuiToolTip,
} from '@elastic/eui';
import type { Composition } from '@elastic/isomer-sdk';
import type {
  RenderPdf,
  StudioAppProps,
  StudioAppSurface,
  StudioTheme,
} from '@elastic/isomer-studio';

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

/** `slide` is the React render with its builds; the rest are the host's surfaces. */
type StageView = 'slide' | StudioAppSurface;

type StageProps = Pick<
  StudioAppProps,
  'Preview' | 'Surface' | 'surfaces' | 'renderPdf' | 'theme' | 'navigate'
>;

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
        presenter.current && document.fullscreenElement === presenter.current
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

const INTERACTIVE =
  'a, button, input, select, textarea, label, [role="button"]';

const isInteractive = (target: EventTarget): boolean =>
  target instanceof Element && target.matches(INTERACTIVE);

const FORWARD_KEYS = new Set(['ArrowRight', 'ArrowDown', 'PageDown', ' ']);
const BACK_KEYS = new Set(['ArrowLeft', 'ArrowUp', 'PageUp']);
/** Keys an output view keeps for scrolling. */
const SCROLL_KEYS = new Set([
  'ArrowDown',
  'ArrowUp',
  'PageDown',
  'PageUp',
  ' ',
]);

const download = (blob: Blob, name: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url));
};

const PdfButton = ({
  renderPdf,
  slides,
  entry: { id, title },
}: {
  renderPdf: RenderPdf | undefined;
  slides: readonly Composition[];
  entry: DeckEntry;
}) => {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  if (!renderPdf) {
    return (
      <EuiToolTip content="PDFs render under isomer-studio dev.">
        <EuiButton size="s" iconType="download" isDisabled>
          Download PDF
        </EuiButton>
      </EuiToolTip>
    );
  }
  const onClick = async () => {
    setBusy(true);
    setError(undefined);
    try {
      download(await renderPdf(slides, { title }), `${id}.pdf`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : String(caught));
    } finally {
      setBusy(false);
    }
  };
  return (
    <EuiToolTip content={error} title={error ? 'The PDF failed' : undefined}>
      <EuiButton
        size="s"
        iconType="download"
        isLoading={busy}
        color={error ? 'danger' : 'primary'}
        onClick={() => void onClick()}>
        Download PDF
      </EuiButton>
    </EuiToolTip>
  );
};

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
  entry,
  deck,
  Preview,
  renderPdf,
  theme,
  navigate,
}: {
  entry: DeckEntry;
  deck: SavedDeck;
} & Pick<StageProps, 'Preview' | 'renderPdf' | 'theme' | 'navigate'>) => {
  const { id, title } = entry;
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
          <PdfButton {...{ renderPdf, slides, entry }} />
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
  entry,
  deck,
  place: requested,
  Preview,
  Surface,
  surfaces,
  renderPdf,
  theme,
  navigate,
}: {
  entry: DeckEntry;
  deck: SavedDeck;
  place: DeckPlace;
} & StageProps) => {
  const { id, title } = entry;
  const slides = useThemedSlides(deck, theme);
  const builds = useMemo(
    () => deck.slides.map((slide) => slideBuilds(slide)),
    [deck]
  );
  const [view, setView] = useState<StageView>('slide');
  const views = useMemo(
    () => [
      { id: 'slide', label: 'Slide' },
      ...surfaces.filter((surface) => surface.id !== 'react'),
    ],
    [surfaces]
  );
  const place = clampPlace(requested, builds);
  const { slide, step } = place;
  const composition = slides[slide];
  const isSlide = view === 'slide';
  const slideAt = (index: number): DeckPlace | undefined =>
    index >= 0 && index < slides.length ? { slide: index, step: 0 } : undefined;
  const previous = isSlide ? stepBack(place, builds) : slideAt(slide - 1);
  const next = isSlide ? stepForward(place, builds) : slideAt(slide + 1);

  const go = useCallback(
    (to: DeckPlace) => navigate(formatDeckPath({ deck: id, place: to })),
    [id, navigate]
  );

  const presenter = useRef<HTMLDivElement>(null);
  const zoom = usePresentingZoom(presenter);
  const togglePresenting = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void presenter.current?.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const { key, shiftKey, altKey, ctrlKey, metaKey, defaultPrevented } =
        event;
      const [target] = event.composedPath();
      if (
        defaultPrevented ||
        altKey ||
        ctrlKey ||
        metaKey ||
        isEditable(target ?? null) ||
        (!isSlide && SCROLL_KEYS.has(key)) ||
        (key === ' ' && target !== undefined && isInteractive(target))
      ) {
        return;
      }
      if (key === 'f' && isSlide) {
        event.preventDefault();
        togglePresenting();
        return;
      }
      const to =
        key === ' ' && shiftKey
          ? previous
          : FORWARD_KEYS.has(key)
            ? next
            : BACK_KEYS.has(key)
              ? previous
              : key === 'Home'
                ? firstPlace
                : key === 'End'
                  ? lastPlace(builds)
                  : undefined;
      if (FORWARD_KEYS.has(key) || BACK_KEYS.has(key) || to) {
        event.preventDefault();
      }
      if (to) {
        go(to);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [builds, go, isSlide, next, previous, togglePresenting]);

  const onClickCapture = (event: MouseEvent) => {
    const linked = linkedSlide(event);
    if (linked !== undefined) {
      event.preventDefault();
      go({ slide: linked, step: 0 });
    }
  };

  const lastClick = useRef<Event>();
  /** Clicking the slide advances, unless it lands on something clickable or ends a text selection. */
  const onClick = (event: MouseEvent) => {
    const { nativeEvent } = event;
    const path = nativeEvent.composedPath();
    const selection = window.getSelection();
    // React also listens on the shadow root `Preview` portals into, so one click arrives twice.
    const isRepeat = lastClick.current === nativeEvent;
    lastClick.current = nativeEvent;
    if (
      isRepeat ||
      event.defaultPrevented ||
      path.some(isInteractive) ||
      (selection && !selection.isCollapsed)
    ) {
      return;
    }
    if (next) {
      go(next);
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
  const stepButtons = (
    <>
      <EuiButtonIcon
        iconType="chevronSingleLeft"
        aria-label="Previous"
        isDisabled={!previous}
        onClick={() => previous && go(previous)}
      />
      <EuiButtonIcon
        iconType="chevronSingleRight"
        aria-label="Next"
        isDisabled={!next}
        onClick={() => next && go(next)}
      />
    </>
  );

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
          <EuiFlexGroup gutterSize="xs" responsive={false}>
            {stepButtons}
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>{composition.title ?? `Slide ${slide + 1}`}</h2>
          </EuiTitle>
        </EuiFlexItem>
        {isSlide && stepCount > 0 ? (
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
          <PdfButton {...{ renderPdf, slides, entry }} />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButton
            size="s"
            iconType="fullScreen"
            isDisabled={!isSlide}
            onClick={togglePresenting}>
            Present
          </EuiButton>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiButtonGroup
        legend="Output"
        buttonSize="compressed"
        options={views}
        idSelected={view}
        onChange={(selected) => setView(selected as StageView)}
      />
      {isSlide ? (
        <div
          ref={presenter}
          className={styles.presenter}
          style={stageStyle}
          {...{ onClickCapture, onClick }}>
          <div className={styles.screen} data-test-subj="deckStage">
            <Preview
              {...{ composition, onCommit }}
              heading={false}
              enhancements={BUILDS}
              zoom={zoom ?? 'fit'}
            />
          </div>
          <div className={styles.overlay}>
            {stepButtons}
            <EuiButtonIcon
              iconType="fullScreenExit"
              aria-label="Stop presenting"
              onClick={togglePresenting}
            />
          </div>
        </div>
      ) : (
        <div
          className={styles.presenter}
          style={stageStyle}
          data-test-subj="deckOutput">
          <div className={styles.screen}>
            <Surface {...{ composition }} surface={view} heading={false} />
          </div>
        </div>
      )}
    </div>
  );
};

/** The committed decks in `decks/`, at `#/app/decks/<deck>/<n>/<step>`. */
const DecksApp = ({
  Preview,
  Surface,
  surfaces,
  renderPdf,
  theme,
  path,
  navigate,
}: StudioAppProps) => {
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
    <SlideStage
      {...{
        entry,
        deck,
        place,
        Preview,
        Surface,
        surfaces,
        renderPdf,
        theme,
        navigate,
      }}
    />
  ) : (
    <DeckSlides {...{ entry, deck, Preview, renderPdf, theme, navigate }} />
  );
};

export default DecksApp;
