/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiButton, EuiProvider } from '@elastic/eui';
import { render } from '@testing-library/react';

const emotionStyles = () =>
  document.head.querySelectorAll('style[data-emotion]').length;

const renderButton = () =>
  render(
    <EuiProvider>
      <EuiButton>Go</EuiButton>
    </EuiProvider>
  );

// The two cases run in order: the second checks what the first left behind.
describe('test_setup', () => {
  it('lets EUI insert its styles', () => {
    renderButton();
    expect(emotionStyles()).toBeGreaterThan(0);
  });

  it('clears them before the next test, and EUI inserts them again', () => {
    expect(emotionStyles()).toBe(0);
    renderButton();
    expect(emotionStyles()).toBeGreaterThan(0);
  });
});
