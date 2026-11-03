/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DraftReport } from './compose_sync';
import { ComposeSync } from './compose_sync';
import type { EditorInitial } from './use_editor';

const DELAY = 400;

const deferred = <T>() => {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

const draft = (source: string, isHeld = false): DraftReport => ({
  source,
  format: 'json',
  isHeld,
});

const initial = (source: string): EditorInitial => ({
  source,
  format: 'json',
});

/** A controller whose encodes wait until the test settles them. */
const setup = ({
  saves = true,
  fits = (source: string) => source.length < 10,
} = {}) => {
  const encodes: { source: string; settle: (code?: string) => void }[] = [];
  const options = {
    save: vi.fn((_draft: DraftReport) => saves),
    trust: vi.fn(),
    fits: vi.fn(fits),
    encode: vi.fn((source: string) => {
      const { promise, resolve, reject } = deferred<string>();
      encodes.push({
        source,
        settle: (code) =>
          code === undefined ? reject(new Error('no')) : resolve(code),
      });
      return promise;
    }),
    write: vi.fn(),
    delay: DELAY,
  };
  return { sync: new ComposeSync(options), options, encodes };
};

const settled = () => new Promise<void>((resolve) => queueMicrotask(resolve));

/** Lets promise callbacks run under fake timers. */
const flush = async () => {
  for (let i = 0; i < 5; i += 1) {
    await settled();
  }
};

const fallback = () => initial('fallback');

describe('ComposeSync', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for typing to pause, then saves, trusts and encodes only the latest draft', async () => {
    const { sync, options, encodes } = setup();
    sync.update(draft('a'));
    vi.advanceTimersByTime(DELAY - 1);
    sync.update(draft('ab'));
    vi.advanceTimersByTime(DELAY - 1);
    expect(options.save).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(options.save).toHaveBeenCalledExactlyOnceWith(draft('ab'));
    expect(options.trust).toHaveBeenCalledExactlyOnceWith(draft('ab'));
    encodes[0]?.settle('AB');
    await flush();
    expect(options.write).toHaveBeenCalledExactlyOnceWith({
      code: 'AB',
      lang: 'json',
    });
  });

  it('drops an encode a newer draft supersedes', async () => {
    const { sync, options, encodes } = setup();
    sync.update(draft('old'));
    vi.advanceTimersByTime(DELAY);
    sync.update(draft('new'));
    encodes[0]?.settle('OLD');
    await flush();
    expect(options.write).not.toHaveBeenCalled();

    vi.advanceTimersByTime(DELAY);
    encodes[1]?.settle('NEW');
    await flush();
    expect(options.write).toHaveBeenCalledExactlyOnceWith({
      code: 'NEW',
      lang: 'json',
    });
  });

  it('keeps a held draft out of storage, and keeps its link', async () => {
    const { sync, options, encodes } = setup();
    sync.update(draft('held', true));
    vi.advanceTimersByTime(DELAY);
    expect(options.save).not.toHaveBeenCalled();
    expect(options.trust).not.toHaveBeenCalled();
    encodes[0]?.settle('HELD');
    await flush();
    expect(options.write).toHaveBeenCalledWith({ code: 'HELD', lang: 'json' });
  });

  it('points a draft too large for a link at the saved draft, or warns when it is not saved', () => {
    const saved = setup();
    saved.sync.update(draft('much too large'));
    vi.advanceTimersByTime(DELAY);
    expect(saved.options.encode).not.toHaveBeenCalled();
    expect(saved.options.write).toHaveBeenCalledExactlyOnceWith({});
    expect(saved.sync.getState().isUnsaved).toBe(false);

    const unsaved = setup({ saves: false });
    unsaved.sync.update(draft('much too large'));
    vi.advanceTimersByTime(DELAY);
    expect(unsaved.options.write).not.toHaveBeenCalled();
    expect(unsaved.sync.getState().isUnsaved).toBe(true);

    unsaved.sync.update(draft('small'));
    vi.advanceTimersByTime(DELAY);
    expect(unsaved.sync.getState().isUnsaved).toBe(false);
  });

  describe('dispose', () => {
    it('saves a draft still waiting on the pause and points the URL at it', () => {
      const { sync, options } = setup();
      sync.update(draft('quick'));
      sync.dispose();
      expect(options.save).toHaveBeenCalledExactlyOnceWith(draft('quick'));
      expect(options.encode).not.toHaveBeenCalled();
      expect(options.write).toHaveBeenCalledExactlyOnceWith({});

      vi.advanceTimersByTime(DELAY);
      expect(options.save).toHaveBeenCalledOnce();
    });

    it('leaves the URL alone when the pending draft could not be saved', () => {
      const { sync, options } = setup();
      sync.update(draft('held', true));
      sync.dispose();
      expect(options.write).not.toHaveBeenCalled();
    });

    it('points the URL at the saved draft mid-encode, and drops the encode', async () => {
      const { sync, options, encodes } = setup();
      sync.update(draft('stale'));
      vi.advanceTimersByTime(DELAY);
      sync.dispose();
      expect(options.write).toHaveBeenCalledExactlyOnceWith({});

      encodes[0]?.settle('STALE');
      await flush();
      expect(options.write).toHaveBeenCalledOnce();
    });

    it('keeps an encode still in flight from writing over the next composer', async () => {
      const first = setup();
      first.sync.update(draft('stale'));
      vi.advanceTimersByTime(DELAY);
      first.sync.dispose();

      const next = setup();
      next.sync.open({}, vi.fn(), fallback);
      next.sync.update(draft('fresh'));
      first.encodes[0]?.settle('STALE');
      await flush();
      expect(first.options.write).toHaveBeenCalledExactlyOnceWith({});

      vi.advanceTimersByTime(DELAY);
      next.encodes[0]?.settle('FRESH');
      await flush();
      expect(next.options.write).toHaveBeenCalledExactlyOnceWith({
        code: 'FRESH',
        lang: 'json',
      });
    });

    it('aborts a link still loading', () => {
      const { sync } = setup();
      let signal: AbortSignal | undefined;
      sync.open(
        { src: 'a.json' },
        (given) => {
          signal = given;
          return new Promise(() => undefined);
        },
        fallback
      );
      sync.dispose();
      expect(signal?.aborted).toBe(true);
    });

    it('loads the same link again when it reopens, as a Fast Refresh does', async () => {
      const { sync } = setup();
      sync.open(
        { src: 'a.json' },
        () => new Promise(() => undefined),
        fallback
      );
      sync.dispose();
      sync.open(
        { src: 'a.json' },
        () => Promise.resolve(initial('loaded')),
        fallback
      );
      await flush();
      expect(sync.getState()).toMatchObject({
        isLoading: false,
        seed: { initial: initial('loaded') },
      });
    });

    it.each([
      ['loaded', () => Promise.resolve(initial('loaded'))],
      ['failed', () => Promise.reject(new Error('gone'))],
    ])(
      'keeps a link that already %s when it reopens, so its editor stays mounted',
      async (_settled, load) => {
        const { sync } = setup();
        sync.open({ src: 'a.json' }, load, fallback);
        await flush();
        const { seed } = sync.getState();
        sync.dispose();
        const reload = vi.fn(() => Promise.resolve(initial('reloaded')));
        sync.open({ src: 'a.json' }, reload, fallback);
        await flush();
        expect(reload).not.toHaveBeenCalled();
        expect(sync.getState().seed).toBe(seed);
      }
    );
  });

  describe('open', () => {
    it('starts an empty composer from the fallback, and keeps a draft it already has', () => {
      const { sync } = setup();
      const load = vi.fn();
      sync.open({}, load, fallback);
      const { seed } = sync.getState();
      expect(seed?.initial).toEqual(fallback());
      expect(load).not.toHaveBeenCalled();

      sync.open(
        { code: 'bad' },
        () => Promise.reject(new Error('no')),
        fallback
      );
      sync.open({}, load, () => initial('other'));
      expect(sync.getState().seed).toBe(seed);
    });

    it('plants a loaded link as a new seed, and reports a failed one over the fallback', async () => {
      const { sync } = setup();
      const loaded = deferred<EditorInitial>();
      sync.open({ code: 'a' }, () => loaded.promise, fallback);
      expect(sync.getState()).toEqual({ isLoading: true, isUnsaved: false });
      loaded.resolve(initial('linked'));
      await flush();
      expect(sync.getState()).toMatchObject({
        isLoading: false,
        seed: { id: 1, initial: initial('linked') },
      });

      sync.open(
        { code: 'b' },
        () => Promise.reject(new Error('Bad link.')),
        fallback
      );
      await flush();
      expect(sync.getState()).toMatchObject({
        isLoading: false,
        loadError: 'Bad link.',
        seed: { id: 1 },
      });
      sync.dismissError();
      expect(sync.getState().loadError).toBeUndefined();
    });

    it('does not reload what the composer itself wrote', async () => {
      const { sync, encodes } = setup();
      sync.open({}, vi.fn(), fallback);
      sync.update(draft('mine'));
      vi.advanceTimersByTime(DELAY);
      encodes[0]?.settle('MINE');
      await flush();

      const load = vi.fn(() => new Promise<EditorInitial>(() => undefined));
      sync.open({ code: 'MINE', lang: 'json' }, load, fallback);
      expect(load).not.toHaveBeenCalled();
      sync.open({ code: 'OTHER' }, load, fallback);
      expect(load).toHaveBeenCalledOnce();
    });

    it('drops an encode in flight when a link loads', async () => {
      const { sync, options, encodes } = setup();
      sync.open({}, vi.fn(), fallback);
      sync.update(draft('stale'));
      vi.advanceTimersByTime(DELAY);
      sync.open(
        { src: 'a.json' },
        () => new Promise(() => undefined),
        fallback
      );
      encodes[0]?.settle('STALE');
      await flush();
      expect(options.write).not.toHaveBeenCalled();
    });

    it('holds drafts while a link loads, and does not resync them over it', async () => {
      const { sync, options } = setup();
      sync.open({}, vi.fn(), fallback);
      sync.update(draft('pending'));

      const loaded = deferred<EditorInitial>();
      sync.open({ src: 'a.json' }, () => loaded.promise, fallback);
      sync.update(draft('typed'));
      vi.advanceTimersByTime(DELAY);
      expect(options.save).not.toHaveBeenCalled();

      loaded.resolve(initial('linked'));
      await flush();
      vi.advanceTimersByTime(DELAY);
      expect(options.save).not.toHaveBeenCalled();
      expect(sync.getState().seed?.initial).toEqual(initial('linked'));
    });

    it('resumes syncing the latest draft when a load is cancelled or fails', async () => {
      const { sync, options } = setup();
      sync.open({}, vi.fn(), fallback);
      let signal: AbortSignal | undefined;
      sync.open(
        { src: 'slow.json' },
        (given) => {
          signal = given;
          return new Promise(() => undefined);
        },
        fallback
      );
      sync.update(draft('during'));
      sync.open({}, vi.fn(), fallback);
      expect(signal?.aborted).toBe(true);
      expect(sync.getState().isLoading).toBe(false);
      vi.advanceTimersByTime(DELAY);
      expect(options.save).toHaveBeenCalledExactlyOnceWith(draft('during'));

      sync.open(
        { code: 'bad' },
        () => Promise.reject(new Error('no')),
        fallback
      );
      await flush();
      vi.advanceTimersByTime(DELAY);
      expect(options.save).toHaveBeenCalledTimes(2);
    });

    it('ignores a link that lands after starting over', async () => {
      const { sync } = setup();
      const loaded = deferred<EditorInitial>();
      sync.open({ src: 'late.json' }, () => loaded.promise, fallback);
      sync.startOver(initial('starter'));
      expect(sync.getState().isLoading).toBe(false);

      loaded.resolve(initial('late'));
      await flush();
      expect(sync.getState().seed?.initial).toEqual(initial('starter'));
    });
  });
});
