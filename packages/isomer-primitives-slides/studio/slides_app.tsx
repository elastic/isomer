/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import { primitiveExamples } from '@elastic/isomer-sdk';
import type { StudioAppProps } from '@elastic/isomer-studio';

import styles from './slides_app.module.css';

/** Every example of every primitive, one slide each, at `#/app/slides/<type>/<n>`. */
const SlidesApp = ({ Preview, runtime, path, navigate }: StudioAppProps) => {
  const slides = useMemo(
    () =>
      runtime.primitives.flatMap((definition) =>
        primitiveExamples(definition).map(({ name, node }, index) => ({
          path: `${definition.type}/${index}`,
          title: name ?? `${definition.type} ${index + 1}`,
          node,
        }))
      ),
    [runtime]
  );
  const index = Math.max(
    0,
    slides.findIndex((slide) => slide.path === path)
  );
  const slide = slides[index];
  if (!slide) {
    return null;
  }
  const go = (step: number) => {
    const next = slides[index + step];
    if (next) {
      navigate(next.path);
    }
  };

  return (
    <div className={styles.page}>
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="arrowLeft"
            aria-label="Previous slide"
            isDisabled={index === 0}
            onClick={() => go(-1)}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            iconType="arrowRight"
            aria-label="Next slide"
            isDisabled={index === slides.length - 1}
            onClick={() => go(1)}
          />
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiTitle size="xs">
            <h2>{slide.title}</h2>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiText size="s" color="subdued">
            {index + 1} of {slides.length}
          </EuiText>
        </EuiFlexItem>
      </EuiFlexGroup>
      <div className={styles.stage}>
        <Preview nodes={[slide.node]} />
      </div>
    </div>
  );
};

export default SlidesApp;
