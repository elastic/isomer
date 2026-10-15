/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import type { Composition, ValidationResult } from '@elastic/isomer-sdk';
import { act, fireEvent, render, screen, within } from '@testing-library/react';

import type { StudioRuntime } from '../config';
import type { StudioContextValue } from '../studio_context';
import { StudioContextProvider } from '../studio_context';
import type { RasterizePng } from '../types';

import { HtmlSurface } from './html_surface';
import { PngSurface } from './png_surface';
import { ReactSurface } from './react_surface';
import { ScaledPreview } from './scaled_preview';
import { SurfaceBoard } from './surface_board';

class FakeResizeObserver {
  static readonly instances = new Set<FakeResizeObserver>();
  readonly targets = new Set<Element>();

  constructor(private readonly callback: ResizeObserverCallback) {
    FakeResizeObserver.instances.add(this);
  }

  observe(target: Element) {
    this.targets.add(target);
  }

  unobserve(target: Element) {
    this.targets.delete(target);
  }

  disconnect() {
    this.targets.clear();
    FakeResizeObserver.instances.delete(this);
  }

  /** Reports a box size change on `target` to whichever observers watch it. */
  static resize(target: Element) {
    act(() => {
      FakeResizeObserver.instances.forEach((observer) => {
        if (observer.targets.has(target)) {
          observer.callback([], observer);
        }
      });
    });
  }
}

const getter = <K extends 'clientWidth' | 'scrollWidth' | 'scrollHeight'>(
  key: K,
  get: (element: Element) => number
) =>
  vi.spyOn(Element.prototype, key, 'get').mockImplementation(function (
    this: Element
  ) {
    return get(this);
  });

const composition = (title: string): Composition => ({
  type: 'view',
  body: [{ type: title }],
});

const noWarnings: ValidationResult = { valid: true, errors: [], warnings: [] };

const htmlRender = vi.fn((_composition: Composition) => ({
  html: '<p>Hi</p>',
}));

const snapshotRender = vi.fn(() => ({
  html: '<div>frame</div>',
  css: '',
  width: 1920,
  height: 1080,
  warnings: [{ path: 'body[0]', message: 'No height estimate.' }],
}));

// The previews read only these renderers and `rasterizePng` from the Studio.
const studio = (rasterizePng?: RasterizePng) =>
  ({
    runtime: {
      surfaces: {
        html: { render: htmlRender },
        snapshot: { render: snapshotRender },
      },
    } as unknown as StudioRuntime,
    rasterizePng,
  }) as unknown as StudioContextValue;

const withStudio =
  (value: StudioContextValue) =>
  ({ children }: { children: ReactNode }) => (
    <StudioContextProvider {...{ value }}>{children}</StudioContextProvider>
  );

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', FakeResizeObserver);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  FakeResizeObserver.instances.clear();
  htmlRender.mockClear();
});

describe('ScaledPreview', () => {
  it('rescales when edited content resizes its own box', () => {
    let contentWidth = 1920;
    getter('clientWidth', () => 800);
    getter('scrollWidth', () => contentWidth);
    getter('scrollHeight', () => 1080);

    const { rerender } = render(
      <ScaledPreview>
        <div data-testid="content">Narrow</div>
      </ScaledPreview>
    );
    const contentBox = screen.getByTestId('content').parentElement;
    const layoutBox = contentBox?.parentElement;
    if (!contentBox || !layoutBox) {
      throw new Error('No content box.');
    }
    expect(layoutBox).toHaveStyle({ transform: `scale(${800 / 1920})` });

    contentWidth = 3200;
    rerender(
      <ScaledPreview>
        <div data-testid="content">Wider</div>
      </ScaledPreview>
    );
    FakeResizeObserver.resize(contentBox);

    expect(layoutBox).toHaveStyle({ transform: 'scale(0.25)' });
  });
});

describe('HtmlSurface', () => {
  // The frame's document has its own realm, so its layout is stubbed per element.
  const loadDocument = (frame: HTMLIFrameElement, documentWidth: number) => {
    const { documentElement } = frame.contentDocument ?? {};
    if (!documentElement) {
      throw new Error('No frame document.');
    }
    Object.defineProperty(documentElement, 'scrollWidth', {
      configurable: true,
      get: () => Math.max(documentWidth, frame.clientWidth),
    });
    fireEvent.load(frame);
  };

  it('measures each new document from the container width', () => {
    getter('clientWidth', (element) =>
      Math.max(
        800,
        element instanceof HTMLElement
          ? parseFloat(element.style.width) ||
              parseFloat(element.style.minWidth) ||
              0
          : 0
      )
    );

    const { rerender } = render(
      <HtmlSurface html="<div>wide</div>" title="Preview" />
    );
    const frame = screen.getByTitle<HTMLIFrameElement>('Preview');
    loadDocument(frame, 1920);
    expect(frame.clientWidth).toBe(1920);

    rerender(<HtmlSurface html="<p>fluid</p>" title="Preview" />);
    loadDocument(frame, 400);

    expect(frame.clientWidth).toBe(800);
  });

  it('remeasures a widened frame when its container grows', () => {
    let containerWidth = 800;
    getter('clientWidth', (element) =>
      Math.max(
        containerWidth,
        element instanceof HTMLElement
          ? parseFloat(element.style.width) || 0
          : 0
      )
    );

    render(<HtmlSurface html="<div>min-width 1200</div>" title="Preview" />);
    const frame = screen.getByTitle<HTMLIFrameElement>('Preview');
    loadDocument(frame, 1200);
    expect(frame.style.width).toBe('1200px');

    const { parentElement } = frame;
    if (!parentElement) {
      throw new Error('No container.');
    }
    containerWidth = 1600;
    act(() => {
      FakeResizeObserver.resize(parentElement);
    });

    expect(frame.style.width).toBe('');
    expect(frame.clientWidth).toBe(1600);
  });
});

describe('ReactSurface', () => {
  it('shows a renderer error and recovers on the next composition', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const silence = (event: ErrorEvent) => event.preventDefault();
    window.addEventListener('error', silence);
    onTestFinished(() => window.removeEventListener('error', silence));
    const broken = composition('broken');
    htmlRender.mockImplementation((value) => {
      if (value === broken) {
        throw new Error('Half-edited node.');
      }
      return { html: '<p>Hi</p>' };
    });
    const wrapper = withStudio(studio());

    const { rerender } = render(<ReactSurface composition={broken} />, {
      wrapper,
    });
    expect(screen.getByText('The React renderer threw')).toBeInTheDocument();
    expect(screen.getByText('Half-edited node.')).toBeInTheDocument();

    rerender(<ReactSurface composition={broken} />);
    expect(screen.getByText('The React renderer threw')).toBeInTheDocument();

    rerender(<ReactSurface composition={composition('fixed')} />);
    expect(
      screen.queryByText('The React renderer threw')
    ).not.toBeInTheDocument();
    expect(screen.getByTitle('React preview')).toBeInTheDocument();
  });

  it('passes heading and enhancements to the React surface and hands onCommit the shadow root after each commit', () => {
    const reactRender = vi.fn((value: Composition) => (
      <p>{value.body[0]?.type}</p>
    ));
    const wrapper = withStudio({
      runtime: {
        surfaces: { react: { render: reactRender } },
      } as unknown as StudioRuntime,
      createReactContext: () => ({}),
    } as unknown as StudioContextValue);
    const enhancements = ['slideBuilds'];
    const committed: string[] = [];
    const onCommit = vi.fn((root: ShadowRoot) => {
      committed.push(root.textContent ?? '');
    });

    const { rerender } = render(
      <ReactSurface
        composition={composition('first')}
        heading={false}
        {...{ enhancements, onCommit }}
      />,
      { wrapper }
    );
    expect(reactRender).toHaveBeenLastCalledWith(composition('first'), {
      wrapper: true,
      context: {},
      heading: false,
      enhancements,
    });
    const [[root]] = onCommit.mock.calls as [[ShadowRoot]];
    expect(root).toBeInstanceOf(ShadowRoot);

    rerender(
      <ReactSurface
        composition={composition('second')}
        {...{ enhancements, onCommit }}
      />
    );
    expect(onCommit).toHaveBeenLastCalledWith(root);
    expect(committed.at(0)).toBe('first');
    expect(committed.at(-1)).toBe('second');
  });

  it('passes heading and enhancements to the html fallback, which has no root for onCommit', () => {
    const onCommit = vi.fn();
    render(
      <ReactSurface
        composition={composition('plain')}
        heading={false}
        enhancements={['slideBuilds']}
        {...{ onCommit }}
      />,
      { wrapper: withStudio(studio()) }
    );
    expect(htmlRender).toHaveBeenLastCalledWith(composition('plain'), {
      scripts: 'host',
      heading: false,
      enhancements: ['slideBuilds'],
    });
    expect(onCommit).not.toHaveBeenCalled();
  });
});

describe('PngSurface', () => {
  interface Call {
    composition: Composition;
    signal: AbortSignal;
    resolve: (blob: Blob) => void;
  }

  const setup = () => {
    vi.useFakeTimers();
    const calls: Call[] = [];
    const rasterizePng: RasterizePng = (value, { signal }) =>
      new Promise((resolve) => {
        calls.push({ composition: value, signal, resolve });
      });
    let urls = 0;
    const createObjectURL = vi.fn(() => `blob:${++urls}`);
    const revokeObjectURL = vi.fn();
    vi.stubGlobal(
      'URL',
      Object.assign(class extends URL {}, { createObjectURL, revokeObjectURL })
    );
    return { calls, rasterizePng, createObjectURL, revokeObjectURL };
  };

  const wait = (ms: number) =>
    act(async () => {
      await vi.advanceTimersByTimeAsync(ms);
    });

  const settle = (call: Call | undefined) =>
    act(async () => {
      call?.resolve(new Blob(['png']));
      await Promise.resolve();
    });

  it('rasterizes only the latest composition once edits pause', async () => {
    const { calls, rasterizePng } = setup();
    const first = composition('first');
    const second = composition('second');

    const { rerender } = render(
      <PngSurface composition={first} {...{ rasterizePng }} />
    );
    await wait(100);
    rerender(<PngSurface composition={second} {...{ rasterizePng }} />);
    await wait(250);

    expect(calls.map(({ composition: value }) => value)).toEqual([second]);
  });

  it('aborts a rasterization the next edit supersedes and ignores its result', async () => {
    const { calls, rasterizePng, createObjectURL } = setup();

    const { rerender } = render(
      <PngSurface composition={composition('first')} {...{ rasterizePng }} />
    );
    await wait(250);
    rerender(
      <PngSurface composition={composition('second')} {...{ rasterizePng }} />
    );
    expect(calls[0]?.signal.aborted).toBe(true);

    await wait(250);
    await settle(calls[0]);
    expect(createObjectURL).not.toHaveBeenCalled();

    await settle(calls[1]);
    expect(screen.getByAltText('PNG preview')).toHaveAttribute('src', 'blob:1');
  });

  it('revokes each object URL once it is replaced or unmounted', async () => {
    const { calls, rasterizePng, revokeObjectURL } = setup();

    const { rerender, unmount } = render(
      <PngSurface composition={composition('first')} {...{ rasterizePng }} />
    );
    await wait(250);
    await settle(calls[0]);
    rerender(
      <PngSurface composition={composition('second')} {...{ rasterizePng }} />
    );
    await wait(250);
    await settle(calls[1]);
    expect(revokeObjectURL.mock.calls).toEqual([['blob:1']]);

    unmount();
    expect(revokeObjectURL.mock.calls).toEqual([['blob:1'], ['blob:2']]);
  });

  it('shows the image at its size in CSS pixels', async () => {
    const { calls, rasterizePng } = setup();

    render(
      <PngSurface composition={composition('first')} {...{ rasterizePng }} />
    );
    await wait(250);
    await settle(calls[0]);
    const image = screen.getByAltText('PNG preview');
    Object.defineProperty(image, 'naturalWidth', { value: 3840 });
    fireEvent.load(image);

    expect(image.style.width).toBe('1920px');
    expect(image.style.height).toBe('');
  });
});

describe('SurfaceBoard', () => {
  /** The child of `card` that holds `element`. */
  const cardChildOf = (card: HTMLElement, element: HTMLElement) => {
    let child: HTMLElement | null = element;
    while (child && child.parentElement !== card) {
      child = child.parentElement;
    }
    return child;
  };

  it('keeps diagnostics outside the clipped card frame', async () => {
    vi.useFakeTimers();
    const rasterizePng: RasterizePng = () =>
      Promise.reject(new Error('Rasterizer failed.'));

    render(
      <SurfaceBoard
        surfaces={['snapshot', 'png']}
        composition={composition('first')}
        validation={noWarnings}
        view="render"
        zoom="fit"
      />,
      { wrapper: withStudio(studio(rasterizePng)) }
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(250);
    });

    const snapshotCard = screen.getByRole('region', {
      name: 'Snapshot preview',
    });
    const snapshotFrame = cardChildOf(
      snapshotCard,
      within(snapshotCard).getByTitle('Snapshot preview')
    );
    const [warning] = within(snapshotCard).getAllByText(
      'body[0]: No height estimate.'
    );
    expect(snapshotCard).toContainElement(warning ?? null);
    expect(snapshotFrame).not.toContainElement(warning ?? null);

    const pngCard = screen.getByRole('region', { name: 'PNG preview' });
    expect(within(pngCard).getAllByText('Rasterizer failed.')).not.toHaveLength(
      0
    );
    expect(
      pngCard.querySelector('[data-test-subj="surfaceFrame"]')
    ).not.toBeInTheDocument();
  });
});
