/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiButton,
  EuiButtonIcon,
  EuiCallOut,
  EuiFlexItem,
  EuiPopover,
  EuiSelectable,
  EuiText,
  EuiToolTip,
  useEuiTheme,
} from '@elastic/eui';
import type { Composition } from '@elastic/isomer-sdk';
import { css } from '@emotion/react';

import { PrimitiveHeading } from '../chrome/primitive_heading';
import type { ComposeFormat, ComposeParams } from '../model/compose_link';
import {
  decodeSource,
  encodeSource,
  fetchSource,
  formatComposeQuery,
  LONG_LINK,
} from '../model/compose_link';
import {
  isTrusted,
  loadDraft,
  rememberTrusted,
  saveDraft,
} from '../model/compose_storage';
import type { RuntimeDocs, StudioSurface } from '../model/describe_runtime';
import type { StudioContextValue } from '../studio_context';
import { useStudio } from '../studio_context';

import { EditorPanel } from './editor_panel';
import { PreviewPanel } from './preview_panel';
import type { EditorInitial, EditorState } from './use_editor';
import { splitComposition, useEditor } from './use_editor';
import { Workbench } from './workbench';

/** How long the URL and saved draft wait for typing to pause. */
const SYNC_DELAY = 400;

const HEADING = {
  label: 'Composition',
  group: 'Workbench',
  purpose:
    'A whole composition, root fields and all, in JSX or JSON. The address bar carries the draft, so a copy of it shares what you see.',
};

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** JSON when the source opens like a JSON object or array, JSX otherwise. */
export const guessFormat = (source: string): ComposeFormat =>
  /^\s*[[{]/.test(source) ? 'json' : 'jsx';

/** A composed example as a draft, without the theme the Studio composed it in. */
const composedDraft = (composition: Composition): EditorInitial => {
  const { theme: _theme, ...authored } = composition;
  const { root, nodes } = splitComposition(authored);
  return { root, nodes };
};

/** The draft a new composition starts from: the first featured primitive's first example. */
const starterDraft = ({
  docs: { primitives, groups },
  featured,
  compose,
}: Pick<
  StudioContextValue,
  'docs' | 'featured' | 'compose'
>): EditorInitial => {
  const type =
    featured?.find((candidate) =>
      primitives.some((doc) => doc.type === candidate)
    ) ??
    groups[0]?.types[0] ??
    primitives[0]?.type ??
    '';
  const doc = primitives.find((candidate) => candidate.type === type);
  return composedDraft(compose([doc?.examples[0]?.node ?? { type }]));
};

/** Reads what `params` names into a draft. Linked JSX is held unless this tab wrote it. */
const loadParams = async (
  { code, src, lang, example }: ComposeParams,
  {
    docs,
    compose,
    signal,
  }: Pick<StudioContextValue, 'docs' | 'compose'> & { signal: AbortSignal }
): Promise<EditorInitial> => {
  if (code || src) {
    const loaded = code
      ? { source: await decodeSource(code), format: undefined }
      : await fetchSource(src ?? '', { base: window.location.href, signal });
    const format = lang ?? loaded.format ?? guessFormat(loaded.source);
    const { source } = loaded;
    return {
      source,
      format,
      trusted: format === 'json' || isTrusted({ source, format }),
    };
  }
  if (example) {
    const node = docs.primitives.find(({ type }) => type === example.type)
      ?.examples[example.index]?.node;
    if (!node) {
      throw new Error(
        `This Studio has no example ${example.index} of \`${example.type}\`.`
      );
    }
    return composedDraft(compose([node]));
  }
  throw new Error('Nothing to load.');
};

/** Surfaces every top-level primitive in the draft renders to, or all of them for an empty draft. */
export const draftSurfaces = (
  { primitives, surfaces }: Pick<RuntimeDocs, 'primitives' | 'surfaces'>,
  composition: Composition
): StudioSurface[] => {
  const types = new Set(composition.body.map(({ type }) => type));
  const docs = primitives.filter(({ type }) => types.has(type));
  return docs.length
    ? surfaces.filter((surface) =>
        docs.every((doc) => doc.surfaces.includes(surface))
      )
    : surfaces;
};

type NewChoice =
  { kind: 'starter' } | { kind: 'example'; type: string; index: number };

/** New composition: the starter, or any primitive example composed. */
const NewMenu = ({ onSelect }: { onSelect: (choice: NewChoice) => void }) => {
  const { euiTheme } = useEuiTheme();
  const {
    docs: { primitives },
  } = useStudio();
  const [isOpen, setOpen] = useState(false);
  const options = useMemo(
    (): EuiSelectableOption<{ choice?: NewChoice }>[] => [
      { key: 'starter', label: 'Starter', choice: { kind: 'starter' } },
      { key: 'examples', label: 'From an example', isGroupLabel: true },
      ...primitives.flatMap(({ type, label, examples }) =>
        examples.map(({ name }, index) => ({
          key: `${type}/${index}`,
          label: `${label}: ${name}`,
          choice: { kind: 'example' as const, type, index },
        }))
      ),
    ],
    [primitives]
  );

  return (
    <EuiPopover
      isOpen={isOpen}
      closePopover={() => setOpen(false)}
      panelPaddingSize="none"
      anchorPosition="downRight"
      button={
        <EuiToolTip content="New composition">
          <EuiButtonIcon
            size="s"
            color="text"
            iconType="plusCircle"
            aria-label="New composition"
            aria-expanded={isOpen}
            onClick={() => setOpen((open) => !open)}
          />
        </EuiToolTip>
      }>
      <EuiSelectable
        aria-label="New composition"
        searchable
        searchProps={{ placeholder: 'Filter examples', compressed: true }}
        singleSelection
        {...{ options }}
        onChange={(_next, _event, { choice }) => {
          setOpen(false);
          if (choice) {
            onSelect(choice);
          }
        }}
        listProps={{ bordered: false }}
        css={css`
          width: 320px;
        `}>
        {(list, search) => (
          <>
            <div
              css={css`
                padding: ${euiTheme.size.s};
              `}>
              {search}
            </div>
            {list}
          </>
        )}
      </EuiSelectable>
    </EuiPopover>
  );
};

const ShareButton = ({ editor }: { editor: EditorState }) => {
  const [status, setStatus] = useState<{ text: string; isLong: boolean }>();

  const share = async () => {
    const code = await encodeSource(editor.source);
    const url = new URL(
      `#/compose${formatComposeQuery({ code, lang: editor.format })}`,
      window.location.href
    ).href;
    const isLong = url.length > LONG_LINK;
    try {
      await navigator.clipboard.writeText(url);
      setStatus({
        isLong,
        text: isLong
          ? `Copied a ${url.length}-character link, which some apps cut short. Host the source and share #/compose?src=<url> instead.`
          : 'Link copied',
      });
    } catch {
      setStatus({ isLong, text: 'Copy the link from the address bar.' });
    }
  };

  return (
    <EuiToolTip
      content={status?.text ?? 'Copy a link to this draft'}
      onMouseOut={() => setStatus(undefined)}>
      <EuiButtonIcon
        size="s"
        color={status?.isLong ? 'warning' : 'text'}
        iconType="link"
        aria-label="Copy a link to this draft"
        onClick={() => void share()}
      />
    </EuiToolTip>
  );
};

const download = ({ source, format }: EditorState) => {
  const url = URL.createObjectURL(
    new Blob([source], {
      type: format === 'jsx' ? 'text/plain' : 'application/json',
    })
  );
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `composition.${format === 'jsx' ? 'tsx' : 'json'}`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const HeldPreview = ({ onRun }: { onRun: () => void }) => {
  const { euiTheme } = useEuiTheme();
  return (
    <div
      css={css`
        padding: ${euiTheme.size.l};
      `}>
      <EuiCallOut
        color="warning"
        iconType="warning"
        title="Run the JSX from this link?">
        <p>
          This composition came from a link. Its JSX runs as code in this page,
          where it can reach anything the Studio can. Read it first, then run
          it.
        </p>
        <EuiButton color="warning" size="s" fill onClick={onRun}>
          Run this code
        </EuiButton>
      </EuiCallOut>
    </div>
  );
};

/** What the editor reports for syncing: the source as typed, and whether it is still held. */
interface DraftReport {
  source: string;
  format: ComposeFormat;
  isHeld: boolean;
}

const ComposeWorkbench = ({
  initial,
  stacked,
  loadError,
  isLoading,
  onDismissError,
  onNew,
  onDraft,
}: {
  initial: EditorInitial;
  stacked: boolean;
  loadError?: string | undefined;
  isLoading: boolean;
  onDismissError: () => void;
  onNew: (choice: NewChoice) => void;
  onDraft: (draft: DraftReport) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const { docs, theme } = useStudio();
  const editor = useEditor(initial, 'composition');
  const { source, format, isHeld, composition, validation, trust } = editor;

  useEffect(() => {
    onDraft({ source, format, isHeld });
  }, [format, isHeld, onDraft, source]);

  const display = useMemo(
    () => (composition.theme ? composition : { ...composition, theme }),
    [composition, theme]
  );
  const supported = useMemo(
    () => draftSurfaces(docs, composition),
    [docs, composition]
  );

  return (
    <Workbench
      heading={<PrimitiveHeading doc={HEADING} layout="inline" />}
      source={
        <EditorPanel
          {...{ editor }}
          ariaLabel="Composition source"
          trailing={
            <>
              <EuiFlexItem grow={false}>
                <ShareButton {...{ editor }} />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiToolTip content="Download the source">
                  <EuiButtonIcon
                    size="s"
                    color="text"
                    iconType="download"
                    aria-label="Download the source"
                    onClick={() => download(editor)}
                  />
                </EuiToolTip>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <NewMenu onSelect={onNew} />
              </EuiFlexItem>
            </>
          }
          banner={
            loadError || isLoading ? (
              <div
                css={css`
                  padding: 0 ${euiTheme.size.base} ${euiTheme.size.s};
                `}>
                {loadError ? (
                  <EuiCallOut
                    size="s"
                    color="danger"
                    iconType="error"
                    title="The link did not load"
                    onDismiss={onDismissError}>
                    <p>{loadError}</p>
                  </EuiCallOut>
                ) : (
                  <EuiText size="xs" color="subdued">
                    <p>Loading…</p>
                  </EuiText>
                )}
              </div>
            ) : null
          }
        />
      }
      preview={
        isHeld ? (
          <HeldPreview onRun={trust} />
        ) : (
          <PreviewPanel composition={display} {...{ validation, supported }} />
        )
      }
      {...{ editor, supported, stacked }}
    />
  );
};

export interface ComposeViewProps {
  params: ComposeParams;
  /** False while another page shows; the editor keeps its draft but leaves the URL alone. */
  isVisible: boolean;
  stacked: boolean;
  openComposer: (params?: ComposeParams) => void;
  replaceComposer: (params: ComposeParams) => void;
}

/**
 * The composition editor: a whole composition beside its previews. It loads what `params` names,
 * else the last draft, else a starter, and keeps the URL and a saved draft in step as you type.
 */
export const ComposeView = ({
  params,
  isVisible,
  stacked,
  openComposer,
  replaceComposer,
}: ComposeViewProps) => {
  const studio = useStudio();
  const { docs, compose, featured } = studio;
  const [seed, setSeed] = useState<{ id: number; initial: EditorInitial }>();
  const [loadError, setLoadError] = useState<string>();
  const [isLoading, setLoading] = useState(false);
  const [draft, setDraft] = useState<DraftReport>();
  const written = useRef<string>();
  const seeds = useRef(0);

  const plant = useCallback((initial: EditorInitial) => {
    seeds.current += 1;
    setSeed({ id: seeds.current, initial });
  }, []);

  const starter = useCallback(
    () => starterDraft({ docs, featured, compose }),
    [docs, featured, compose]
  );

  useEffect(() => {
    const query = formatComposeQuery(params);
    if (query && query === written.current) {
      return;
    }
    if (!query) {
      setSeed((current) => {
        if (current) {
          return current;
        }
        const stored = loadDraft();
        seeds.current += 1;
        return {
          id: seeds.current,
          initial: stored ? { ...stored, trusted: true } : starter(),
        };
      });
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setLoadError(undefined);
    loadParams(params, { docs, compose, signal: controller.signal }).then(
      (initial) => {
        if (!controller.signal.aborted) {
          plant(initial);
          setLoading(false);
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(errorMessage(error));
          setLoading(false);
          setSeed((current) => {
            if (current) {
              return current;
            }
            seeds.current += 1;
            return { id: seeds.current, initial: starter() };
          });
        }
      }
    );
    return () => {
      controller.abort();
      // A cancelled load must not leave sync paused; a following load sets it again.
      setLoading(false);
    };
    // Loads only when the route asks for something new, not when the runtime reloads.
  }, [params]);

  useEffect(() => {
    // A sync while a link loads would rewrite the params it is loading from and abort it.
    if (!draft || isLoading) {
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      if (!draft.isHeld) {
        saveDraft(draft);
        rememberTrusted(draft);
      }
      void encodeSource(draft.source).then((code) => {
        if (cancelled) {
          return;
        }
        const next = { code, lang: draft.format };
        written.current = formatComposeQuery(next);
        if (isVisible) {
          replaceComposer(next);
        }
      });
    }, SYNC_DELAY);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [draft, isLoading, isVisible, replaceComposer]);

  if (!seed) {
    return null;
  }

  return (
    <ComposeWorkbench
      key={seed.id}
      initial={seed.initial}
      {...{ stacked, loadError, isLoading }}
      onDismissError={() => setLoadError(undefined)}
      onNew={(choice) => {
        setLoadError(undefined);
        if (choice.kind === 'example') {
          openComposer({
            example: { type: choice.type, index: choice.index },
          });
        } else {
          plant(starter());
        }
      }}
      onDraft={setDraft}
    />
  );
};
