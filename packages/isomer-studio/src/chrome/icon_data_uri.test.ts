/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { iconDataUri } from './icon_data_uri';

const colors = { accent: '#f00', bg: '#fff', fg: '#000', muted: '#888' };

const decode = (uri: string) =>
  decodeURIComponent(uri.replace(/^data:image\/svg\+xml;charset=utf-8,/, ''));

describe('iconDataUri', () => {
  it('resolves every colour slot, with or without a fallback, and `currentColor`', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
      '<rect fill="var(--isomer-icon-accent)" stroke="var( --isomer-icon-muted , #123 )"/>' +
      '<circle fill="currentColor"/></svg>';

    expect(decode(iconDataUri(svg, colors))).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">' +
        '<rect fill="#f00" stroke="#888"/><circle fill="#000"/></svg>'
    );
  });

  it('uses the fallback of a slot the host does not know', () => {
    const svg =
      '<svg xmlns="http://www.w3.org/2000/svg"><rect fill="var(--isomer-icon-glow, #abc)"/></svg>';

    expect(decode(iconDataUri(svg, colors))).toContain('fill="#abc"');
  });

  it('adds the SVG namespace an image needs', () => {
    expect(decode(iconDataUri('<svg viewBox="0 0 16 16"></svg>', colors))).toBe(
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16"></svg>'
    );
  });
});
