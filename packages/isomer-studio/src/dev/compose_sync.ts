/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ComposeFormat, ComposeParams } from '../model/compose_link';
import { formatComposeQuery } from '../model/compose_link';
import { createStore } from '../model/store';

import type { EditorInitial } from './use_editor';

/** What the editor reports for syncing: the source as typed, and whether it is still held. */
export interface DraftReport {
  source: string;
  format: ComposeFormat;
  isHeld: boolean;
}

export interface ComposeSyncState {
  /** The draft the editor starts from; a new `id` remounts it. */
  seed?: { id: number; initial: EditorInitial } | undefined;
  loadError?: string | undefined;
  isLoading: boolean;
  /** True when a draft too large for a link could not be saved either, so a reload would lose it. */
  isUnsaved: boolean;
}

export interface ComposeSyncOptions {
  /** Saves a draft a bare `#/compose` reloads; false when the browser could not. */
  save: (draft: DraftReport) => boolean;
  /** Remembers a draft this tab wrote, so its JSX runs when it comes back. */
  trust: (draft: DraftReport) => void;
  fits: (source: string) => boolean;
  encode: (source: string) => Promise<string>;
  write: (params: ComposeParams) => void;
  /** How long a draft waits for typing to pause. */
  delay: number;
  timers?: Pick<typeof globalThis, 'setTimeout' | 'clearTimeout'>;
}

/**
 * Loads what the composer's params name, and keeps the URL and saved draft in step with the
 * editor: a draft waits for typing to pause, is saved, then encoded into the URL. A newer draft,
 * a link load or disposal drops an encode still in flight.
 */
export class ComposeSync {
  readonly #options: ComposeSyncOptions;
  readonly #state = createStore<ComposeSyncState>({
    isLoading: false,
    isUnsaved: false,
  });
  #seeds = 0;
  /** The query last opened or written; opening it again changes nothing. */
  #query: string | undefined;
  #load: AbortController | undefined;
  /** The latest draft reported, which syncs once no link is loading. */
  #draft: DraftReport | undefined;
  #pending: { draft: DraftReport; timer: unknown } | undefined;
  /** The encode allowed to write when it lands, and whether its draft was saved. */
  #encoding: { saved: boolean } | undefined;

  constructor(options: ComposeSyncOptions) {
    this.#options = options;
  }

  readonly subscribe = this.#state.subscribe;
  readonly getState = this.#state.get;

  /** Loads `params` unless the composer opened or wrote them last; an empty editor falls back. */
  readonly open = (
    params: ComposeParams,
    load: (signal: AbortSignal) => Promise<EditorInitial>,
    fallback: () => EditorInitial
  ) => {
    const query = formatComposeQuery(params);
    if (query === this.#query) {
      return;
    }
    this.#query = query;
    this.#abortLoad();
    if (!query) {
      this.#loaded();
      this.#seedIfEmpty(fallback);
      return;
    }
    const controller = new AbortController();
    this.#load = controller;
    this.#cancel();
    this.#set({ isLoading: true, loadError: undefined });
    load(controller.signal).then(
      (initial) => {
        if (!controller.signal.aborted) {
          this.#plant(initial);
          this.#loaded();
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          this.#set({
            loadError: error instanceof Error ? error.message : String(error),
          });
          this.#loaded();
          this.#seedIfEmpty(fallback);
        }
      }
    );
  };

  /** Drops any link still loading, and starts the editor over from `initial`. */
  readonly startOver = (initial: EditorInitial) => {
    this.#abortLoad();
    this.#plant(initial);
    this.#loaded();
  };

  readonly dismissError = () => this.#set({ loadError: undefined });

  /** Syncs `draft` once typing pauses and no link is loading, superseding any draft before it. */
  readonly update = (draft: DraftReport) => {
    this.#draft = draft;
    if (!this.getState().isLoading) {
      this.#schedule(draft);
    }
  };

  /** Stops, saving a draft still waiting on the pause, and points the URL at the saved draft. */
  readonly dispose = () => {
    const pending = this.#pending;
    const encoding = this.#encoding;
    // A link still loading never opened, so opening it again, as a remount does, loads it.
    if (this.#load) {
      this.#query = undefined;
    }
    this.#abortLoad();
    this.#cancel();
    if (pending) {
      this.#flush(pending.draft, true);
    } else if (encoding?.saved) {
      this.#write({});
    }
  };

  /** Renders only for a change, as a React state setter would. */
  #set(patch: Partial<ComposeSyncState>) {
    const state = this.getState();
    const next = { ...state, ...patch };
    if (
      Object.keys(patch).some(
        (key) =>
          !Object.is(
            next[key as keyof ComposeSyncState],
            state[key as keyof ComposeSyncState]
          )
      )
    ) {
      this.#state.set(next);
    }
  }

  #plant(initial: EditorInitial) {
    // The new editor reports its own draft.
    this.#draft = undefined;
    this.#cancel();
    this.#seeds += 1;
    this.#set({ seed: { id: this.#seeds, initial } });
  }

  #seedIfEmpty(fallback: () => EditorInitial) {
    if (!this.getState().seed) {
      this.#plant(fallback());
    }
  }

  #abortLoad() {
    this.#load?.abort();
    this.#load = undefined;
  }

  /** Ends loading, and syncs the latest draft a load held back. */
  #loaded() {
    if (this.getState().isLoading) {
      this.#set({ isLoading: false });
      if (this.#draft) {
        this.#schedule(this.#draft);
      }
    }
  }

  /** Drops the draft waiting on the pause, and any encode in flight. */
  #cancel() {
    (this.#options.timers ?? globalThis).clearTimeout(
      this.#pending?.timer as ReturnType<typeof setTimeout>
    );
    this.#pending = undefined;
    this.#encoding = undefined;
  }

  #schedule(draft: DraftReport) {
    this.#cancel();
    const { delay, timers = globalThis } = this.#options;
    const timer = timers.setTimeout(() => this.#flush(draft, false), delay);
    this.#pending = { draft, timer };
  }

  #flush(draft: DraftReport, disposing: boolean) {
    const { save, trust, fits, encode } = this.#options;
    this.#pending = undefined;
    const saved = !draft.isHeld && save(draft);
    if (!draft.isHeld) {
      trust(draft);
    }
    if (disposing || !fits(draft.source)) {
      if (!disposing) {
        this.#set({ isUnsaved: !saved && !draft.isHeld });
      }
      // A bare `#/compose` reloads the saved draft, so it is safe only once the draft is saved.
      if (saved) {
        this.#write({});
      }
      return;
    }
    this.#set({ isUnsaved: false });
    const encoding = { saved };
    this.#encoding = encoding;
    encode(draft.source).then(
      (code) => {
        if (this.#encoding === encoding) {
          this.#write({ code, lang: draft.format });
        }
      },
      () => {
        if (this.#encoding === encoding) {
          this.#encoding = undefined;
        }
      }
    );
  }

  #write(params: ComposeParams) {
    this.#encoding = undefined;
    this.#query = formatComposeQuery(params);
    this.#options.write(params);
  }
}
