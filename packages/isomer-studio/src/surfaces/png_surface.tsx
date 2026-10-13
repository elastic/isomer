/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { EuiCallOut, EuiLoadingSpinner } from '@elastic/eui';
import type { Composition } from '@elastic/isomer-sdk';
import type { SerializedStyles } from '@emotion/react';
import { css } from '@emotion/react';

import { isPngUnavailableError } from '../model/png_manifest';
import type { RasterizePng } from '../types';
import { PNG_SCALE } from '../types';

import type { PreviewZoom } from './scaled_preview';
import { ScaledPreview } from './scaled_preview';
import { SurfaceFrame } from './surface_frame';

const RASTERIZE_DELAY = 250;

interface Rasterized {
  url: string;
  bytes: number;
}

const describeError = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** The host's PNG of `composition`, refreshed as it changes. */
export const PngSurface = ({
  composition,
  rasterizePng,
  zoom = 'fit',
  frameCss,
}: {
  composition: Composition;
  rasterizePng: RasterizePng;
  zoom?: PreviewZoom;
  /** Styles a frame around the image alone; diagnostics sit outside it. */
  frameCss?: SerializedStyles | undefined;
}) => {
  const [image, setImage] = useState<Rasterized>();
  const [error, setError] = useState<string>();
  const [isUnavailable, setUnavailable] = useState(false);
  const [isLoading, setLoading] = useState(true);
  const [width, setWidth] = useState<number>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    setLoading(true);

    const rasterize = async () => {
      try {
        const blob = await rasterizePng(composition, { signal });
        if (!signal.aborted) {
          setImage({ url: URL.createObjectURL(blob), bytes: blob.size });
          setError(undefined);
          setUnavailable(false);
        }
      } catch (rasterizeError) {
        if (!signal.aborted) {
          setError(describeError(rasterizeError));
          setUnavailable(isPngUnavailableError(rasterizeError));
        }
      } finally {
        if (!signal.aborted) {
          setLoading(false);
        }
      }
    };
    const timer = setTimeout(() => void rasterize(), RASTERIZE_DELAY);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [composition, rasterizePng]);

  useEffect(() => {
    if (!image) {
      return;
    }
    return () => URL.revokeObjectURL(image.url);
  }, [image]);

  return (
    <>
      {isUnavailable ? (
        <EuiCallOut
          announceOnMount
          size="s"
          iconType="info"
          title="No prerendered PNG"
          text={
            <p>
              PNG previews of edited compositions need{' '}
              <code>isomer-studio dev</code>.
            </p>
          }
        />
      ) : error ? (
        <EuiCallOut
          announceOnMount
          size="s"
          color="danger"
          iconType="error"
          title="This surface could not render"
          text={<p>{error}</p>}
        />
      ) : (
        <SurfaceFrame {...{ frameCss }}>
          {image ? (
            <div
              css={css`
                opacity: ${isLoading ? 0.6 : 1};
              `}>
              <ScaledPreview {...{ zoom }}>
                <img
                  src={image.url}
                  alt="PNG preview"
                  style={{ width }}
                  onLoad={({ currentTarget: { naturalWidth } }) =>
                    setWidth(naturalWidth / PNG_SCALE)
                  }
                  css={css`
                    display: block;
                    visibility: ${width ? 'visible' : 'hidden'};
                  `}
                />
              </ScaledPreview>
            </div>
          ) : (
            <EuiLoadingSpinner size="m" aria-label="Rendering PNG" />
          )}
        </SurfaceFrame>
      )}
    </>
  );
};
